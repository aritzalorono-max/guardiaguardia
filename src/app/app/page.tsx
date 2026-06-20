import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const NEXT_STEPS = [
  {
    title: "Médicos",
    description: "Añade los médicos del servicio: adjuntos y residentes.",
    badge: "Listo",
    href: "/app/medicos",
  },
  {
    title: "Calendario",
    description: "Marca vacaciones, bajas y festivos de forma visual.",
    badge: "Fase 4",
  },
  {
    title: "Configuración de guardias",
    description: "Define presenciales/localizadas, plantillas y reglas.",
    badge: "Fase 5",
  },
  {
    title: "Reparto de guardias",
    description: "Genera el reparto justo y ajústalo a mano.",
    badge: "Fase 6",
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("services")
    .select("id, hospital_name, specialty, region, approx_doctors, has_residents")
    .limit(1);

  const service = services?.[0];
  if (!service) redirect("/onboarding");

  const { count: doctorCount } = await supabase
    .from("doctors")
    .select("id", { count: "exact", head: true });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {service.hospital_name}
          </h1>
          <p className="text-slate-500">
            {service.specialty}
            {service.region ? ` · ${service.region}` : ""}
          </p>
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Médicos registrados</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {doctorCount ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Tamaño estimado</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {service.approx_doctors ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Residentes</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {service.has_residents ? "Sí" : "No"}
          </p>
        </div>
      </div>

      {/* Próximos pasos */}
      <h2 className="mt-10 text-lg font-semibold text-slate-900">
        Siguientes pasos
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {NEXT_STEPS.map((s) => {
          const ready = Boolean(s.href);
          const inner = (
            <>
              <div>
                <h3 className="font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.description}</p>
              </div>
              <span
                className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  ready
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {s.badge}
              </span>
            </>
          );
          const cls =
            "flex items-start justify-between rounded-xl border border-slate-200 bg-white p-5";
          return ready ? (
            <Link key={s.title} href={s.href!} className={`${cls} hover:border-teal-300 hover:shadow-sm`}>
              {inner}
            </Link>
          ) : (
            <div key={s.title} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
