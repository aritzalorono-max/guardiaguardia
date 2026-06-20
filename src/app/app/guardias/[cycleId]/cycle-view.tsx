"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fillOpenSlots,
  type EngineRules,
  type EngineDoctor,
  type OpenAssignment,
} from "@/lib/engine/schedule";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const CAT_CLASS: Record<string, string> = {
  laborable: "bg-slate-100 text-slate-700",
  vispera: "bg-amber-100 text-amber-800",
  festivo: "bg-rose-100 text-rose-800",
};
const MOD_LETTER: Record<string, string> = {
  presencial: "P",
  localizada: "L",
  telefonica: "T",
};

type DoctorLite = {
  id: string;
  first_name: string;
  last_name: string;
  kind: "adjunto" | "residente";
  does_guards: boolean;
  is_active: boolean;
};
type Assignment = {
  id: string;
  date: string;
  category: "laborable" | "vispera" | "festivo";
  modality: "presencial" | "localizada" | "telefonica";
  eligible: "cualquiera" | "adjunto" | "residente";
  doctor_id: string | null;
  manual: boolean;
};
type AuditRow = {
  id: string;
  date: string;
  actor_email: string | null;
  old_doctor_id: string | null;
  new_doctor_id: string | null;
  created_at: string;
};
type Leave = {
  id: string;
  doctor_id: string;
  start_date: string;
  end_date: string;
  note: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");
function eachDateInclusive(start: string, end: string): string[] {
  const out: string[] = [];
  if (end < start) return out;
  for (
    let t = new Date(start + "T00:00:00Z");
    t <= new Date(end + "T00:00:00Z");
    t = new Date(t.getTime() + 86_400_000)
  )
    out.push(t.toISOString().slice(0, 10));
  return out;
}

function canCover(
  kind: "adjunto" | "residente",
  modality: string,
  eligible: string,
  rules: EngineRules,
) {
  if (eligible === "adjunto" && kind !== "adjunto") return false;
  if (eligible === "residente" && kind !== "residente") return false;
  if (rules.presencialOnlyResidents && modality === "presencial" && kind !== "residente")
    return false;
  if (rules.localizadaOnlyAdjuntos && modality === "localizada" && kind !== "adjunto")
    return false;
  return true;
}

export function CycleView({
  cycle,
  serviceId,
  actorEmail,
  doctors,
  initialAssignments,
  initialAudit,
  initialLeaves,
  rules,
  blocked,
}: {
  cycle: {
    id: string;
    name: string | null;
    start_year: number;
    start_month: number;
    months: number;
    status: string;
  };
  serviceId: string;
  actorEmail: string;
  doctors: DoctorLite[];
  initialAssignments: Assignment[];
  initialAudit: AuditRow[];
  initialLeaves: Leave[];
  rules: EngineRules;
  blocked: Record<string, string[]>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [audit, setAudit] = useState<AuditRow[]>(initialAudit);
  const [leaves, setLeaves] = useState<Leave[]>(initialLeaves);
  const [status, setStatus] = useState(cycle.status);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [pick, setPick] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // Baja: formulario
  const [leaveDoctor, setLeaveDoctor] = useState("");
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");

  const cycleEnd = useMemo(() => {
    const d = new Date(Date.UTC(cycle.start_year, cycle.start_month + cycle.months, 0));
    return d.toISOString().slice(0, 10);
  }, [cycle]);
  const cycleStart = `${cycle.start_year}-${pad(cycle.start_month + 1)}-01`;

  const docName = useMemo(
    () => new Map(doctors.map((d) => [d.id, `${d.last_name}, ${d.first_name}`])),
    [doctors],
  );
  const docById = useMemo(() => new Map(doctors.map((d) => [d.id, d])), [doctors]);
  const candidates = doctors.filter((d) => d.does_guards && d.is_active);

  // Bloqueo efectivo por médico: ausencias del calendario + bajas del ciclo.
  const effectiveBlocked = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const [id, dates] of Object.entries(blocked))
      m.set(id, new Set(dates));
    for (const lv of leaves) {
      let set = m.get(lv.doctor_id);
      if (!set) {
        set = new Set();
        m.set(lv.doctor_id, set);
      }
      for (const d of eachDateInclusive(lv.start_date, lv.end_date)) set.add(d);
    }
    return m;
  }, [blocked, leaves]);

  const gapDiff = Math.max(
    rules.noConsecutive || rules.freeDayAfter || rules.rest12h ? 2 : 1,
    rules.minDaysBetween ?? 1,
  );

  // Resumen por médico
  const { summaryRows, gaps, spread } = useMemo(() => {
    const m = new Map<string, { laborable: number; vispera: number; festivo: number; total: number }>();
    let g = 0;
    for (const a of assignments) {
      if (!a.doctor_id) {
        g++;
        continue;
      }
      const s = m.get(a.doctor_id) ?? { laborable: 0, vispera: 0, festivo: 0, total: 0 };
      s[a.category]++;
      s.total++;
      m.set(a.doctor_id, s);
    }
    const rows = [...m.entries()].sort((a, b) =>
      (docName.get(a[0]) ?? "").localeCompare(docName.get(b[0]) ?? ""),
    );
    const totals = rows.map(([, s]) => s.total);
    return {
      summaryRows: rows,
      gaps: g,
      spread: totals.length ? Math.max(...totals) - Math.min(...totals) : 0,
    };
  }, [assignments, docName]);

  const byDate = useMemo(() => {
    const m = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const arr = m.get(a.date) ?? [];
      arr.push(a);
      m.set(a.date, arr);
    }
    return m;
  }, [assignments]);

  // Avisos para asignar un médico a la guardia en edición
  function warningsFor(doctorId: string): string[] {
    if (!editing || !doctorId) return [];
    const doc = docById.get(doctorId);
    if (!doc) return [];
    const w: string[] = [];
    if (!canCover(doc.kind, editing.modality, editing.eligible, rules))
      w.push("No cumple la elegibilidad del puesto.");
    if (effectiveBlocked.get(doctorId)?.has(editing.date))
      w.push("No está disponible ese día (ausencia o baja).");
    const epoch = Date.parse(editing.date) / 86_400_000;
    const others = assignments.filter(
      (a) => a.id !== editing.id && a.doctor_id === doctorId,
    );
    if (others.some((a) => a.date === editing.date))
      w.push("Ya tiene otra guardia ese mismo día.");
    if (
      others.some((a) => {
        const diff = Math.abs(Date.parse(a.date) / 86_400_000 - epoch);
        return diff > 0 && diff < gapDiff;
      })
    )
      w.push("Rompe el descanso (guardia en un día demasiado cercano).");
    const cap = doc.kind === "residente" ? rules.maxPerMonthResident : rules.maxPerMonthAdjunto;
    if (cap != null) {
      const monthKey = editing.date.slice(0, 7);
      const n = others.filter((a) => a.date.slice(0, 7) === monthKey).length;
      if (n + 1 > cap) w.push(`Supera el tope mensual (${cap}).`);
    }
    return w;
  }

  async function saveEdit() {
    if (!editing) return;
    const newDoctor = pick || null;
    const oldDoctor = editing.doctor_id;
    if (newDoctor === oldDoctor) {
      setEditing(null);
      return;
    }

    setAssignments((arr) =>
      arr.map((a) =>
        a.id === editing.id ? { ...a, doctor_id: newDoctor, manual: true } : a,
      ),
    );

    await supabase
      .from("guard_assignments")
      .update({ doctor_id: newDoctor, manual: true })
      .eq("id", editing.id);

    const { data: auditRow } = await supabase
      .from("assignment_audit")
      .insert({
        service_id: serviceId,
        cycle_id: cycle.id,
        assignment_id: editing.id,
        date: editing.date,
        actor_email: actorEmail,
        old_doctor_id: oldDoctor,
        new_doctor_id: newDoctor,
      })
      .select("id, date, actor_email, old_doctor_id, new_doctor_id, created_at")
      .single();
    if (auditRow) setAudit((a) => [auditRow, ...a]);

    setEditing(null);
  }

  async function toggleStatus() {
    const next = status === "published" ? "draft" : "published";
    setStatus(next);
    await supabase.from("cycles").update({ status: next }).eq("id", cycle.id);
  }

  // Registrar una baja y liberar (dejar en hueco) sus guardias de la ventana.
  async function addLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveDoctor || !leaveFrom) return;
    const from = leaveFrom < cycleStart ? cycleStart : leaveFrom;
    const to = leaveTo ? (leaveTo > cycleEnd ? cycleEnd : leaveTo) : cycleEnd;
    setBusy(true);
    try {
      const { data: lv } = await supabase
        .from("cycle_leaves")
        .insert({
          service_id: serviceId,
          cycle_id: cycle.id,
          doctor_id: leaveDoctor,
          start_date: from,
          end_date: to,
        })
        .select("id, doctor_id, start_date, end_date, note")
        .single();
      if (lv) setLeaves((l) => [...l, lv]);

      const affected = assignments.filter(
        (a) => a.doctor_id === leaveDoctor && a.date >= from && a.date <= to,
      );
      if (affected.length) {
        const ids = affected.map((a) => a.id);
        await supabase
          .from("guard_assignments")
          .update({ doctor_id: null, manual: true })
          .in("id", ids);
        const rows = affected.map((a) => ({
          service_id: serviceId,
          cycle_id: cycle.id,
          assignment_id: a.id,
          date: a.date,
          actor_email: actorEmail,
          old_doctor_id: leaveDoctor,
          new_doctor_id: null,
        }));
        const { data: inserted } = await supabase
          .from("assignment_audit")
          .insert(rows)
          .select("id, date, actor_email, old_doctor_id, new_doctor_id, created_at");
        if (inserted) setAudit((a) => [...inserted, ...a]);
        const idset = new Set(ids);
        setAssignments((arr) =>
          arr.map((a) => (idset.has(a.id) ? { ...a, doctor_id: null, manual: true } : a)),
        );
      }
      setLeaveDoctor("");
      setLeaveFrom("");
      setLeaveTo("");
    } finally {
      setBusy(false);
    }
  }

  // Reactivar: quitar la baja (no recupera las guardias ya repartidas).
  async function removeLeave(id: string) {
    setLeaves((l) => l.filter((x) => x.id !== id));
    await supabase.from("cycle_leaves").delete().eq("id", id);
  }

  // Rellenar automáticamente los huecos con el motor.
  async function fillHoles() {
    setBusy(true);
    try {
      const engineDoctors: EngineDoctor[] = candidates.map((d) => ({
        id: d.id,
        kind: d.kind,
        doesGuards: true,
        isActive: true,
        partTime: false,
      }));
      const open: OpenAssignment[] = assignments.map((a) => ({
        id: a.id,
        date: a.date,
        category: a.category,
        modality: a.modality,
        eligible: a.eligible,
        doctorId: a.doctor_id,
      }));
      const { filled } = fillOpenSlots({
        assignments: open,
        doctors: engineDoctors,
        rules,
        blockedGuardDates: effectiveBlocked,
      });
      if (filled.length === 0) return;

      for (const f of filled) {
        await supabase
          .from("guard_assignments")
          .update({ doctor_id: f.doctorId, manual: false })
          .eq("id", f.id);
      }
      const rows = filled.map((f) => {
        const a = assignments.find((x) => x.id === f.id)!;
        return {
          service_id: serviceId,
          cycle_id: cycle.id,
          assignment_id: f.id,
          date: a.date,
          actor_email: `${actorEmail} (auto)`,
          old_doctor_id: null,
          new_doctor_id: f.doctorId,
        };
      });
      const { data: inserted } = await supabase
        .from("assignment_audit")
        .insert(rows)
        .select("id, date, actor_email, old_doctor_id, new_doctor_id, created_at");
      if (inserted) setAudit((a) => [...inserted, ...a]);

      const byId = new Map(filled.map((f) => [f.id, f.doctorId]));
      setAssignments((arr) =>
        arr.map((a) =>
          byId.has(a.id) ? { ...a, doctor_id: byId.get(a.id)!, manual: false } : a,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  const monthsList = Array.from({ length: cycle.months }, (_, i) => {
    const d = new Date(Date.UTC(cycle.start_year, cycle.start_month + i, 1));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            status === "published"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {status === "published" ? "Publicado" : "Borrador"}
        </span>
        <button
          onClick={toggleStatus}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {status === "published" ? "Pasar a borrador" : "Publicar"}
        </button>
      </div>

      {/* Bajas a mitad de ciclo */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Bajas a mitad de ciclo</h2>
        <p className="text-xs text-slate-500">
          Si alguien causa baja, libera sus guardias del periodo indicado. Luego
          rellena los huecos automáticamente o asígnalos a mano (bolsa).
        </p>

        {leaves.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {leaves.map((lv) => (
              <li
                key={lv.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
              >
                <span>
                  <strong>{docName.get(lv.doctor_id) ?? "—"}</strong>{" "}
                  <span className="text-slate-500">
                    {lv.start_date} → {lv.end_date}
                  </span>
                </span>
                <button
                  onClick={() => removeLeave(lv.id)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
                >
                  Reactivar
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={addLeave} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Médico</span>
            <select
              value={leaveDoctor}
              onChange={(e) => setLeaveDoctor(e.target.value)}
              required
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Selecciona…</option>
              {candidates.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.last_name}, {d.first_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Desde</span>
            <input
              type="date"
              value={leaveFrom}
              min={cycleStart}
              max={cycleEnd}
              onChange={(e) => setLeaveFrom(e.target.value)}
              required
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Hasta (opcional)
            </span>
            <input
              type="date"
              value={leaveTo}
              min={leaveFrom || cycleStart}
              max={cycleEnd}
              onChange={(e) => setLeaveTo(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            Liberar guardias
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-400">
          Si no indicas &laquo;hasta&raquo;, la baja se aplica hasta el final del
          periodo ({cycleEnd}).
        </p>
      </div>

      {gaps > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>
            Hay <strong>{gaps}</strong> puesto(s) sin cubrir (huecos). Asígnalos a
            mano (clic en el día) o rellénalos automáticamente.
          </span>
          <button
            onClick={fillHoles}
            disabled={busy}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "Trabajando…" : "Rellenar huecos"}
          </button>
        </div>
      )}

      {/* Resumen */}
      <h2 className="mt-6 text-lg font-semibold text-slate-900">Resumen por médico</h2>
      <p className="text-xs text-slate-500">
        Diferencia entre quien más y quien menos guardias tiene:{" "}
        <strong>{spread}</strong>.
      </p>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Médico</th>
              <th className="px-4 py-2 font-medium">Laborable</th>
              <th className="px-4 py-2 font-medium">Víspera</th>
              <th className="px-4 py-2 font-medium">Festivo</th>
              <th className="px-4 py-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {summaryRows.map(([id, s]) => (
              <tr key={id}>
                <td className="px-4 py-2 font-medium text-slate-900">
                  {docName.get(id) ?? "—"}
                </td>
                <td className="px-4 py-2">{s.laborable}</td>
                <td className="px-4 py-2">{s.vispera}</td>
                <td className="px-4 py-2">{s.festivo}</td>
                <td className="px-4 py-2 font-semibold">{s.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Calendario editable */}
      <h2 className="mt-8 text-lg font-semibold text-slate-900">Calendario</h2>
      <p className="text-xs text-slate-500">
        Pulsa sobre una guardia o un hueco para cambiarla a mano.
      </p>
      <div className="mt-3 space-y-6">
        {monthsList.map(({ year, month }) => {
          const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const cells: (number | null)[] = Array(firstWeekday).fill(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);
          while (cells.length % 7 !== 0) cells.push(null);

          return (
            <div key={`${year}-${month}`} className="rounded-xl border border-slate-200 bg-white p-3">
              <h3 className="mb-2 font-semibold text-slate-900">
                {MONTHS[month]} {year}
              </h3>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((w, i) => (
                  <div key={w} className={`py-1 text-center text-xs font-semibold ${i >= 5 ? "text-rose-400" : "text-slate-400"}`}>
                    {w}
                  </div>
                ))}
                {cells.map((day, idx) => {
                  if (day === null) return <div key={idx} />;
                  const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const items = byDate.get(date) ?? [];
                  return (
                    <div key={idx} className="min-h-[72px] rounded-lg border border-slate-100 p-1">
                      <div className="text-xs font-semibold text-slate-400">{day}</div>
                      <div className="mt-0.5 space-y-0.5">
                        {items.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => {
                              setEditing(a);
                              setPick(a.doctor_id ?? "");
                            }}
                            title={a.doctor_id ? docName.get(a.doctor_id) : "Hueco"}
                            className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium hover:ring-1 hover:ring-slate-300 ${
                              a.doctor_id ? CAT_CLASS[a.category] : "bg-red-100 text-red-700"
                            }`}
                          >
                            {a.doctor_id
                              ? `${docById.get(a.doctor_id)?.last_name ?? "?"} ·${MOD_LETTER[a.modality]}`
                              : "Hueco"}
                            {a.manual && <span className="ml-0.5 text-slate-400">✎</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Historial de cambios */}
      {audit.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">Historial de cambios</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            {audit.slice(0, 30).map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <span className="text-slate-400">
                  {new Date(a.created_at).toLocaleString("es-ES")} ·{" "}
                </span>
                {a.date}:{" "}
                <strong>{a.old_doctor_id ? docName.get(a.old_doctor_id) ?? "—" : "Hueco"}</strong>{" "}
                →{" "}
                <strong>{a.new_doctor_id ? docName.get(a.new_doctor_id) ?? "—" : "Hueco"}</strong>
                {a.actor_email && <span className="text-slate-400"> · {a.actor_email}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modal de edición */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Editar guardia</h3>
            <p className="mt-1 text-sm text-slate-500">
              {editing.date} · {editing.modality}
              {editing.eligible !== "cualquiera" ? ` · solo ${editing.eligible}s` : ""}
            </p>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Asignar a</span>
              <select
                value={pick}
                onChange={(e) => setPick(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">— Dejar hueco —</option>
                {candidates.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.last_name}, {d.first_name}
                    {d.kind === "residente" ? " (R)" : ""}
                  </option>
                ))}
              </select>
            </label>

            {warningsFor(pick).length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <p className="font-medium">Avisos (puedes asignarlo igualmente):</p>
                <ul className="mt-1 list-disc pl-4">
                  {warningsFor(pick).map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
