import Link from "next/link";
import { LEGAL } from "@/lib/legal";

const LINKS: [string, string][] = [
  ["/legal/aviso-legal", "Aviso legal"],
  ["/legal/privacidad", "Privacidad"],
  ["/legal/cookies", "Cookies"],
  ["/legal/condiciones", "Condiciones"],
  ["/contacto", "Contacto"],
];

export function LegalFooter() {
  return (
    <footer className="border-t border-slate-200">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          © {new Date().getFullYear()} {LEGAL.appName}
        </span>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-slate-800">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
