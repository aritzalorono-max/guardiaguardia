import Link from "next/link";

const features = [
  {
    title: "Reparto justo y automático",
    description:
      "Todos hacen el mismo número de guardias de cada tipo (laborable, víspera y festivo), teniendo en cuenta el histórico de cada médico.",
  },
  {
    title: "A la medida de tu servicio",
    description:
      "Cada hospital funciona distinto: presenciales, localizadas, una o varias personas por día… Lo configuras tú en el alta.",
  },
  {
    title: "Calendario visual",
    description:
      "Vacaciones, bajas, permisos y días especiales en un calendario claro, con festivos y fines de semana marcados.",
  },
  {
    title: "Reglas activables",
    description:
      "Descansos legales, topes por mes, equidad de festivos, R1 con tutor… Activa o desactiva cada regla con un clic.",
  },
  {
    title: "Cambios sobre la marcha",
    description:
      "¿Una baja a mitad de trimestre? Libera sus guardias, ofrécelas o repártelas de nuevo sin rehacer todo.",
  },
  {
    title: "Comparte el resultado",
    description:
      "Un resumen claro y un enlace de solo lectura para enviar las guardias a todo el equipo.",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* Cabecera */}
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-600 text-white">
              G
            </span>
            GuardiaGuardia
          </span>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 font-medium text-slate-700 hover:bg-slate-100"
            >
              Entrar
            </Link>
            <Link
              href="/registro"
              className="rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700"
            >
              Crear servicio
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700">
          Gestión de guardias médicas
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Las guardias de tu servicio, repartidas de forma justa y sin
          quebraderos de cabeza.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Configura cómo funciona tu servicio, marca las ausencias en un
          calendario y deja que GuardiaGuardia proponga un reparto equilibrado
          que luego puedes ajustar a mano.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/registro"
            className="rounded-lg bg-teal-600 px-6 py-3 font-medium text-white shadow-sm hover:bg-teal-700"
          >
            Empezar gratis
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {/* Características */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-base font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pie */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-slate-500">
          GuardiaGuardia · Hecho para los servicios de guardia de los
          hospitales.
        </div>
      </footer>
    </main>
  );
}
