import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { generateCycle } from "./actions";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function GuardiasPage() {
  const supabase = await createClient();

  const { data: services } = await supabase.from("services").select("id").limit(1);
  if (!services?.[0]) redirect("/onboarding");

  const [{ data: cycles }, { count: slotCount }, { count: doctorCount }] =
    await Promise.all([
      supabase
        .from("cycles")
        .select("id, name, start_year, start_month, months, status, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("guard_slots").select("id", { count: "exact", head: true }),
      supabase
        .from("doctors")
        .select("id", { count: "exact", head: true })
        .eq("does_guards", true)
        .eq("is_active", true),
    ]);

  const now = new Date();
  const ready = (slotCount ?? 0) > 0 && (doctorCount ?? 0) > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Guardias</h1>
      <p className="text-slate-500">
        Genera el reparto de un periodo (normalmente un trimestre) y ajústalo
        después.
      </p>

      {!ready && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Para generar un reparto necesitas al menos un{" "}
          <Link href="/app/configuracion" className="font-medium underline">
            puesto de guardia configurado
          </Link>{" "}
          y{" "}
          <Link href="/app/medicos" className="font-medium underline">
            médicos que hagan guardias
          </Link>
          .
        </div>
      )}

      {/* Nuevo reparto */}
      <form
        action={generateCycle}
        className="mt-6 rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="font-semibold text-slate-900">Nuevo reparto</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Mes de inicio
            </span>
            <select
              name="startMonth"
              defaultValue={now.getMonth()}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Año
            </span>
            <input
              type="number"
              name="startYear"
              defaultValue={now.getFullYear()}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Duración
            </span>
            <select
              name="months"
              defaultValue={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value={1}>1 mes</option>
              <option value={2}>2 meses</option>
              <option value={3}>3 meses (trimestre)</option>
              <option value={4}>4 meses</option>
              <option value={6}>6 meses</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Nombre (opcional)
            </span>
            <input
              type="text"
              name="name"
              placeholder="Ej. 1er trimestre"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={!ready}
          className="mt-4 rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          Generar reparto
        </button>
      </form>

      {/* Ciclos existentes */}
      <h2 className="mt-8 text-lg font-semibold text-slate-900">
        Repartos guardados
      </h2>
      {(cycles?.length ?? 0) === 0 ? (
        <p className="mt-2 text-sm text-slate-500">
          Aún no has generado ningún reparto.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {cycles!.map((c) => (
            <Link
              key={c.id}
              href={`/app/guardias/${c.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-teal-300"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {c.name || `${MONTHS[c.start_month]} ${c.start_year}`}
                </p>
                <p className="text-sm text-slate-500">
                  {MONTHS[c.start_month]} {c.start_year} ·{" "}
                  {c.months} {c.months === 1 ? "mes" : "meses"}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  c.status === "published"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {c.status === "published" ? "Publicado" : "Borrador"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
