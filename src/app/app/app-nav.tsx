"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app", label: "Panel", exact: true },
  { href: "/app/medicos", label: "Médicos" },
  { href: "/app/calendario", label: "Calendario", soon: true },
  { href: "/app/guardias", label: "Guardias", soon: true },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto -mb-px flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-disabled={l.soon}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${
              active
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {l.label}
            {l.soon && (
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                pronto
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
