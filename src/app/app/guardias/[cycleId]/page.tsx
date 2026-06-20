import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteCycle } from "../actions";

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

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  const { cycleId } = await params;
  const supabase = await createClient();

  const { data: services } = await supabase.from("services").select("id").limit(1);
  if (!services?.[0]) redirect("/onboarding");

  const { data: cycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("id", cycleId)
    .single();
  if (!cycle) notFound();

  const [{ data: assignments }, { data: doctors }] = await Promise.all([
    supabase
      .from("guard_assignments")
      .select("date, category, modality, doctor_id, manual")
      .eq("cycle_id", cycleId)
      .order("date", { ascending: true }),
    supabase.from("doctors").select("id, first_name, last_name"),
  ]);

  const docName = new Map(
    (doctors ?? []).map((d) => [d.id, `${d.last_name}, ${d.first_name}`]),
  );
  const docSurname = new Map((doctors ?? []).map((d) => [d.id, d.last_name]));

  // Mapa fecha -> asignaciones
  const byDate = new Map<string, typeof assignments>();
  for (const a of assignments ?? []) {
    const arr = byDate.get(a.date) ?? [];
    arr.push(a);
    byDate.set(a.date, arr);
  }

  // Resumen por médico
  type Sum = { laborable: number; vispera: number; festivo: number; total: number };
  const summary = new Map<string, Sum>();
  let gaps = 0;
  for (const a of assignments ?? []) {
    if (!a.doctor_id) {
      gaps++;
      continue;
    }
    const s =
      summary.get(a.doctor_id) ??
      { laborable: 0, vispera: 0, festivo: 0, total: 0 };
    s[a.category as "laborable" | "vispera" | "festivo"]++;
    s.total++;
    summary.set(a.doctor_id, s);
  }
  const summaryRows = [...summary.entries()].sort((a, b) =>
    (docName.get(a[0]) ?? "").localeCompare(docName.get(b[0]) ?? ""),
  );
  const totals = summaryRows.map(([, s]) => s.total);
  const spread = totals.length ? Math.max(...totals) - Math.min(...totals) : 0;

  // Meses del periodo
  const monthsList: { year: number; month: number }[] = [];
  for (let i = 0; i < cycle.months; i++) {
    const d = new Date(Date.UTC(cycle.start_year, cycle.start_month + i, 1));
    monthsList.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/app/guardias"
            className="text-sm text-teal-700 hover:underline"
          >
            ‹ Volver a Guardias
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {cycle.name || `${MONTHS[cycle.start_month]} ${cycle.start_year}`}
          </h1>
          <p className="text-slate-500">
            {MONTHS[cycle.start_month]} {cycle.start_year} · {cycle.months}{" "}
            {cycle.months === 1 ? "mes" : "meses"}
          </p>
        </div>
        <form action={deleteCycle}>
          <input type="hidden" name="cycleId" value={cycleId} />
          <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
            Eliminar reparto
          </button>
        </form>
      </div>

      {/* Avisos */}
      {gaps > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Hay <strong>{gaps}</strong> puesto(s) sin cubrir (huecos). Revisa la
          disponibilidad o ajusta las reglas y vuelve a generar.
        </div>
      )}

      {/* Resumen por médico */}
      <h2 className="mt-6 text-lg font-semibold text-slate-900">
        Resumen por médico
      </h2>
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

      {/* Calendario por mes */}
      <h2 className="mt-8 text-lg font-semibold text-slate-900">Calendario</h2>
      <div className="mt-3 space-y-6">
        {monthsList.map(({ year, month }) => {
          const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const cells: (number | null)[] = Array(firstWeekday).fill(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);
          while (cells.length % 7 !== 0) cells.push(null);

          return (
            <div
              key={`${year}-${month}`}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <h3 className="mb-2 font-semibold text-slate-900">
                {MONTHS[month]} {year}
              </h3>
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
                  const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const items = byDate.get(date) ?? [];
                  return (
                    <div
                      key={idx}
                      className="min-h-[72px] rounded-lg border border-slate-100 p-1"
                    >
                      <div className="text-xs font-semibold text-slate-400">
                        {day}
                      </div>
                      <div className="mt-0.5 space-y-0.5">
                        {items.map((a, i) => (
                          <div
                            key={i}
                            title={a.doctor_id ? docName.get(a.doctor_id) : "Hueco"}
                            className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                              a.doctor_id
                                ? CAT_CLASS[a.category]
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {a.doctor_id
                              ? `${docSurname.get(a.doctor_id) ?? "?"} ·${MOD_LETTER[a.modality]}`
                              : "Hueco"}
                            {a.manual && (
                              <span className="ml-0.5 text-slate-400">✎</span>
                            )}
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

      {/* Leyenda */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-slate-200" /> Laborable
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-200" /> Víspera
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-rose-200" /> Festivo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-200" /> Hueco
        </span>
        <span>P = presencial · L = localizada · T = telefónica</span>
      </div>
    </div>
  );
}
