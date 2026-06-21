"use client";

import { useMemo, useState } from "react";

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
const MOD_LABEL: Record<string, string> = {
  presencial: "Presencial",
  localizada: "Localizada",
  telefonica: "Telefónica",
};

type AssignmentLite = {
  date: string;
  category: string;
  modality: string;
  doctor: string | null;
  surname: string | null;
  substitute: string | null;
  substitute_surname: string | null;
};

export type SharedData = {
  expired: boolean;
  service: { hospital_name: string; specialty: string };
  cycle: {
    name: string | null;
    start_year: number;
    start_month: number;
    months: number;
    status: string;
  };
  assignments: AssignmentLite[];
};

function downloadICS(items: AssignmentLite[], filename: string) {
  const icsDate = (d: string) => d.replace(/-/g, "");
  const nextDay = (d: string) => {
    const t = new Date(d + "T00:00:00Z");
    t.setUTCDate(t.getUTCDate() + 1);
    return t.toISOString().slice(0, 10).replace(/-/g, "");
  };
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GuardiaGuardia//ES//"];
  items.forEach((a, i) => {
    const doer = a.substitute ?? a.doctor;
    if (!doer) return;
    lines.push(
      "BEGIN:VEVENT",
      `UID:gg-${i}-${a.date}@guardiaguardia`,
      `DTSTART;VALUE=DATE:${icsDate(a.date)}`,
      `DTEND;VALUE=DATE:${nextDay(a.date)}`,
      `SUMMARY:Guardia ${MOD_LABEL[a.modality] ?? ""} - ${doer}`,
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function SharedCycle({ data }: { data: SharedData }) {
  const { service, cycle, assignments } = data;
  const [filter, setFilter] = useState("__all__");

  const doctorNames = useMemo(
    () =>
      [
        ...new Set(
          assignments
            .map((a) => a.substitute ?? a.doctor)
            .filter(Boolean) as string[],
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [assignments],
  );

  const byDate = useMemo(() => {
    const m = new Map<string, AssignmentLite[]>();
    for (const a of assignments) {
      const arr = m.get(a.date) ?? [];
      arr.push(a);
      m.set(a.date, arr);
    }
    return m;
  }, [assignments]);

  const summary = useMemo(() => {
    const m = new Map<string, { laborable: number; vispera: number; festivo: number; total: number }>();
    for (const a of assignments) {
      if (!a.doctor) continue;
      const s = m.get(a.doctor) ?? { laborable: 0, vispera: 0, festivo: 0, total: 0 };
      s[a.category as "laborable" | "vispera" | "festivo"]++;
      s.total++;
      m.set(a.doctor, s);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [assignments]);

  const monthsList = Array.from({ length: cycle.months }, (_, i) => {
    const d = new Date(Date.UTC(cycle.start_year, cycle.start_month + i, 1));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
  });

  function exportICS() {
    const items =
      filter === "__all__"
        ? assignments
        : assignments.filter((a) => (a.substitute ?? a.doctor) === filter);
    downloadICS(items, "guardias.ics");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {service.hospital_name}
          </h1>
          <p className="text-slate-500">
            {service.specialty} ·{" "}
            {cycle.name || `${MONTHS[cycle.start_month]} ${cycle.start_year}`} ·{" "}
            {cycle.months} {cycle.months === 1 ? "mes" : "meses"}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 print:hidden">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="__all__">Todos los médicos</option>
            {doctorNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button
            onClick={exportICS}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Descargar .ics
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Resumen */}
      <h2 className="mt-6 text-lg font-semibold text-slate-900">Resumen</h2>
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
            {summary.map(([name, s]) => (
              <tr key={name}>
                <td className="px-4 py-2 font-medium text-slate-900">{name}</td>
                <td className="px-4 py-2">{s.laborable}</td>
                <td className="px-4 py-2">{s.vispera}</td>
                <td className="px-4 py-2">{s.festivo}</td>
                <td className="px-4 py-2 font-semibold">{s.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Calendario */}
      <div className="mt-6 space-y-6">
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
                  const items = (byDate.get(date) ?? []).filter(
                    (a) =>
                      filter === "__all__" ||
                      (a.substitute ?? a.doctor) === filter,
                  );
                  return (
                    <div key={idx} className="min-h-[64px] rounded-lg border border-slate-100 p-1">
                      <div className="text-xs font-semibold text-slate-400">{day}</div>
                      <div className="mt-0.5 space-y-0.5">
                        {items.map((a, i) => (
                          <div
                            key={i}
                            title={
                              a.substitute
                                ? `${a.substitute} (sustituye a ${a.doctor}, de baja)`
                                : (a.doctor ?? "Hueco")
                            }
                            className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                              a.doctor ? CAT_CLASS[a.category] : "bg-red-100 text-red-700"
                            }`}
                          >
                            {a.doctor
                              ? `${a.substitute_surname ?? a.surname} ·${MOD_LETTER[a.modality]}${a.substitute ? " ↺" : ""}`
                              : "Hueco"}
                          </div>
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

      <p className="mt-8 text-center text-xs text-slate-400">
        Generado con GuardiaGuardia · P = presencial · L = localizada · T = telefónica
      </p>
    </div>
  );
}
