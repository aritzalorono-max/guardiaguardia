import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-lg font-semibold text-slate-900"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-600 text-white">
          G
        </span>
        GuardiaGuardia
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {children}
      </div>
      <nav className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
        <Link href="/legal/aviso-legal" className="hover:text-slate-600">
          Aviso legal
        </Link>
        <Link href="/legal/privacidad" className="hover:text-slate-600">
          Privacidad
        </Link>
        <Link href="/legal/condiciones" className="hover:text-slate-600">
          Condiciones
        </Link>
        <Link href="/contacto" className="hover:text-slate-600">
          Contacto
        </Link>
      </nav>
    </div>
  );
}
