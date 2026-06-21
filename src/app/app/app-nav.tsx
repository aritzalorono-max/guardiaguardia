"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: {
  href: string;
  label: string;
  exact?: boolean;
  soon?: boolean;
}[] = [
  { href: "/app", label: "Panel", exact: true },
  { href: "/app/medicos", label: "Médicos" },
  { href: "/app/calendario", label: "Calendario" },
  { href: "/app/configuracion", label: "Configuración" },
  { href: "/app/guardias", label: "Guardias" },
  { href: "/app/cuenta", label: "Cuenta" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto -mb-px flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        const base =
          "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition";

        if (l.soon) {
          return (
            <span
              key={l.href}
              className={`${base} cursor-default border-transparent text-slate-300`}
            >
              {l.label}
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                pronto
              </span>
            </span>
          );
        }

        return (
          <Link
            key={l.href}
            href={l.href}
            className={`${base} ${
              active
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
