"use client";

import { useCallbackRef } from "@/lib/use-callback-ref";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import { nationalHolidays } from "@/lib/holidays";

type DoctorLite = {
  id: string;
  first_name: string;
  last_name: string;
  kind: string;
  resident_level: string | null;
};
type DayTypeLite = {
  id: string;
  name: string;
  color: string;
  counts_as_worked: boolean;
  allows_guard: boolean;
};
type HolidayLite = {
  id: string;
  date: string;
  name: string | null;
  is_festivo: boolean;
};

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function CalendarManager({
  serviceId,
  doctors,
  dayTypes,
  initialHolidays,
  initialSeededYears,
}: {
  serviceId: string;
  doctors: DoctorLite[];
  dayTypes: DayTypeLite[];
  initialHolidays: HolidayLite[];
  initialSeededYears: number[];
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const [mode, setMode] = useState<"absences" | "holidays">("absences");
  const [brush, setBrush] = useState<string>(dayTypes[0]?.id ?? "erase");
  const [holidays, setHolidays] = useState<HolidayLite[]>(initialHolidays);
  const [seededYears, setSeededYears] = useState<Set<number>>(
    () => new Set(initialSeededYears),
  );
  const [absences, setAbsences] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const typeById = useMemo(
    () => new Map(dayTypes.map((t) => [t.id, t])),
    [dayTypes],
  );
  // Override por fecha (si existe fila): define si es festivo y su nombre.
  const overrideByDate = useMemo(
    () => new Map(holidays.map((h) => [h.date, h])),
    [holidays],
  );

  // ¿Es festivo ese día? Override si existe; si no, fin de semana.
  const isFestivoDate = (date: string, weekday: number) => {
    const o = overrideByDate.get(date);
    if (o) return o.is_festivo;
    return weekday >= 5;
  };

  // --- Cargar ausencias del médico/mes seleccionados ---
  const reloadAbsences = useCallbackRef(async () => {
    if (!doctorId) {
      setAbsences({});
      return;
    }
    const start = ymd(year, month, 1);
    const end = ymd(year, month, new Date(year, month + 1, 0).getDate());
    const { data } = await supabase
      .from("absences")
      .select("start_date, day_type_id")
      .eq("doctor_id", doctorId)
      .gte("start_date", start)
      .lte("start_date", end);
    const map: Record<string, string> = {};
    for (const a of data ?? []) map[a.start_date] = a.day_type_id;
    setAbsences(map);
  });

  useEffect(() => {
    reloadAbsences();
  }, [doctorId, year, month, reloadAbsences]);

  // --- Pintado por arrastre ---
  const painting = useRef(false);
  const pending = useRef<Map<string, string | null>>(new Map());

  function applyBrush(date: string) {
    if (mode !== "absences" || !doctorId) return;
    setAbsences((prev) => {
      const next = { ...prev };
      if (brush === "erase") delete next[date];
      else next[date] = brush;
      return next;
    });
    pending.current.set(date, brush === "erase" ? null : brush);
  }

  async function flushPending() {
    if (pending.current.size === 0) return;
    const changes = pending.current;
    pending.current = new Map();
    const dates = [...changes.keys()];
    setBusy(true);
    try {
      await supabase
        .from("absences")
        .delete()
        .eq("doctor_id", doctorId)
        .in("start_date", dates);
      const rows = dates
        .filter((d) => changes.get(d))
        .map((d) => ({
          service_id: serviceId,
          doctor_id: doctorId,
          day_type_id: changes.get(d)!,
          start_date: d,
          end_date: d,
        }));
      if (rows.length) await supabase.from("absences").insert(rows);
    } catch {
      toast.error("No se pudo guardar. Revisa tu conexión.");
      await reloadAbsences();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    function up() {
      if (painting.current) {
        painting.current = false;
        flushPending();
      }
    }
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, serviceId]);

  // --- Festivos ---
  // Un clic alterna el estado festivo del día. El "por defecto" es: fin de
  // semana = festivo, resto = laborable. Si el nuevo estado coincide con el
  // por defecto, se borra el override; si no, se guarda.
  async function toggleHoliday(date: string) {
    const weekday = (new Date(date + "T00:00:00Z").getUTCDay() + 6) % 7;
    const def = weekday >= 5; // por defecto festivo si es finde
    const current = isFestivoDate(date, weekday);
    const next = !current;
    const existing = holidays.find((h) => h.date === date);

    if (next === def) {
      // Vuelve al estado por defecto: quitar el override si lo hay.
      if (existing) {
        setHolidays((h) => h.filter((x) => x.id !== existing.id));
        const { error } = await supabase.from("holidays").delete().eq("id", existing.id);
        if (error) toast.error("No se pudo guardar. Reintenta.");
      }
      return;
    }

    // Guardar override (festivo o forzado laborable).
    const { data, error } = await supabase
      .from("holidays")
      .upsert(
        {
          service_id: serviceId,
          date,
          is_festivo: next,
          name: next ? "Festivo" : null,
        },
        { onConflict: "service_id,date" },
      )
      .select("id, date, name, is_festivo")
      .single();
    if (error || !data) {
      toast.error("No se pudo guardar. Reintenta.");
      return;
    }
    setHolidays((h) => [...h.filter((x) => x.date !== date), data]);
  }

  // Rellena automáticamente los festivos nacionales de un año la primera vez
  // que se ve (después respeta los que el usuario haya quitado).
  const seedYear = useCallbackRef(async (y: number) => {
    if (seededYears.has(y)) return;
    setSeededYears((prev) => new Set(prev).add(y));
    const rows = nationalHolidays(y).map((h) => ({
      service_id: serviceId,
      date: h.date,
      name: h.name,
    }));
    await supabase
      .from("holidays")
      .upsert(rows, { onConflict: "service_id,date", ignoreDuplicates: true });
    await supabase
      .from("seeded_holiday_years")
      .upsert(
        { service_id: serviceId, year: y },
        { onConflict: "service_id,year", ignoreDuplicates: true },
      );
    const { data } = await supabase
      .from("holidays")
      .select("id, date, name, is_festivo");
    setHolidays(data ?? []);
  });

  useEffect(() => {
    seedYear(year);
  }, [year, seedYear]);

  // --- Navegación de mes ---
  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    setMonth(m);
    setYear(y);
  }

  // --- Construcción de la rejilla ---
  const cells = useMemo(() => {
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (number | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const monthCount = Object.keys(absences).length;

  if (doctors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-slate-600">
          Primero añade médicos para poder gestionar su calendario.
        </p>
        <Link
          href="/app/medicos"
          className="mt-4 inline-block rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700"
        >
          Ir a Médicos
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Calendario</h1>
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
          <button
            onClick={() => setMode("absences")}
            className={`rounded-md px-3 py-1.5 font-medium ${
              mode === "absences" ? "bg-teal-600 text-white" : "text-slate-600"
            }`}
          >
            Ausencias
          </button>
          <button
            onClick={() => setMode("holidays")}
            className={`rounded-md px-3 py-1.5 font-medium ${
              mode === "holidays" ? "bg-teal-600 text-white" : "text-slate-600"
            }`}
          >
            Festivos
          </button>
        </div>
      </div>

      {/* Controles */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white">
          <button
            onClick={() => shiftMonth(-1)}
            className="px-3 py-2 text-slate-600 hover:bg-slate-50"
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <span className="min-w-[140px] text-center text-sm font-semibold text-slate-900">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={() => shiftMonth(1)}
            className="px-3 py-2 text-slate-600 hover:bg-slate-50"
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>
        <button
          onClick={() => {
            setMonth(today.getMonth());
            setYear(today.getFullYear());
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Hoy
        </button>

        {mode === "absences" && (
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.last_name}, {d.first_name}
                {d.kind === "residente" && d.resident_level
                  ? ` (${d.resident_level})`
                  : ""}
              </option>
            ))}
          </select>
        )}

        {busy && <span className="text-xs text-slate-400">Guardando…</span>}
      </div>

      {/* Paleta / acciones según modo */}
      {mode === "absences" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">Pincel:</span>
          {dayTypes.map((t) => (
            <button
              key={t.id}
              onClick={() => setBrush(t.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                brush === t.id
                  ? "border-slate-900 ring-1 ring-slate-900"
                  : "border-slate-200"
              }`}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: t.color }}
              />
              {t.name}
            </button>
          ))}
          <button
            onClick={() => setBrush("erase")}
            className={`rounded-full border px-3 py-1 text-sm ${
              brush === "erase"
                ? "border-slate-900 ring-1 ring-slate-900"
                : "border-slate-200"
            }`}
          >
            Borrar
          </button>
          <span className="ml-auto text-xs text-slate-400">
            {monthCount} día{monthCount === 1 ? "" : "s"} marcado
            {monthCount === 1 ? "" : "s"} este mes
          </span>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Los <strong>fines de semana</strong> y los <strong>festivos
          nacionales</strong> ya están marcados como festivos. Haz clic en un día
          para <strong>alternarlo</strong>: marca un laborable como festivo
          (autonómico/local) o quita un festivo, incluido un sábado o domingo si
          ese día se trabaja con normalidad.
        </div>
      )}

      {/* Rejilla del calendario */}
      <div className="mt-4 select-none rounded-xl border border-slate-200 bg-white p-3">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`py-1 text-center text-xs font-semibold ${
                i >= 5 ? "text-rose-400" : "text-slate-400"
              }`}
            >
              {w}
            </div>
          ))}
          {cells.map((day, idx) => {
            if (day === null) return <div key={idx} />;
            const date = ymd(year, month, day);
            const weekday = (new Date(year, month, day).getDay() + 6) % 7;
            const festivo = isFestivoDate(date, weekday);
            const override = overrideByDate.get(date);
            const festivoLabel = override?.is_festivo ? override.name : null;
            const absTypeId = absences[date];
            const absType = absTypeId ? typeById.get(absTypeId) : undefined;
            const isToday =
              year === today.getFullYear() &&
              month === today.getMonth() &&
              day === today.getDate();

            const base =
              "relative flex h-16 flex-col items-start justify-start rounded-lg p-1.5 text-left transition";
            let bg = "bg-white hover:bg-slate-50";
            if (!absType && festivo) bg = "bg-rose-50 hover:bg-rose-100";

            return (
              <button
                key={idx}
                type="button"
                title={festivoLabel ?? absType?.name ?? ""}
                onClick={
                  mode === "holidays" ? () => toggleHoliday(date) : undefined
                }
                onPointerDown={
                  mode === "absences"
                    ? () => {
                        painting.current = true;
                        applyBrush(date);
                      }
                    : undefined
                }
                onPointerEnter={
                  mode === "absences"
                    ? () => {
                        if (painting.current) applyBrush(date);
                      }
                    : undefined
                }
                className={`${base} ${bg} border ${
                  isToday ? "border-teal-500" : "border-slate-100"
                }`}
                style={absType ? { backgroundColor: absType.color } : undefined}
              >
                <span
                  className={`text-xs font-semibold ${
                    absType
                      ? "text-white"
                      : festivo
                        ? "text-rose-600"
                        : "text-slate-700"
                  }`}
                >
                  {day}
                </span>
                {festivoLabel && !absType && (
                  <span className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-rose-500">
                    {festivoLabel}
                  </span>
                )}
                {absType && (
                  <span className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-white/90">
                    {absType.name}
                  </span>
                )}
                {festivo && absType && (
                  <span
                    title={festivoLabel ? `Festivo: ${festivoLabel}` : "Festivo / fin de semana"}
                    className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-rose-50 ring-1 ring-rose-200" />
          Festivo / fin de semana
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
          Festivo bajo una ausencia
        </span>
        {dayTypes.map((t) => (
          <span key={t.id} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded"
              style={{ backgroundColor: t.color }}
            />
            {t.name}
            <span className="text-slate-400">
              ({t.counts_as_worked ? "trabaja" : "no trabaja"},{" "}
              {t.allows_guard ? "guardia" : "sin guardia"})
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
