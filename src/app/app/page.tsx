import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("services")
    .select("id, hospital_name, specialty");

  const hasService = (services?.length ?? 0) > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Panel</h1>

      {!hasService ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Bienvenido/a 👋
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Aún no has configurado tu servicio. En el siguiente paso te
            preguntaremos por tu hospital, la especialidad y cómo hacéis las
            guardias. (Onboarding — próxima fase).
          </p>
          <span className="mt-4 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            Fase 2 en construcción
          </span>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services!.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="font-semibold text-slate-900">
                {s.hospital_name}
              </h3>
              <p className="text-sm text-slate-500">{s.specialty}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
