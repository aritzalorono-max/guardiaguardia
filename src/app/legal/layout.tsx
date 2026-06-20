import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-6 py-5">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold text-slate-900"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-600 text-white">
              G
            </span>
            GuardiaGuardia
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 [&_a]:text-teal-700 [&_a]:underline [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc [&_li]:text-slate-600 [&_p]:mt-3 [&_p]:leading-relaxed [&_p]:text-slate-600 [&_ul]:mt-3 [&_ul]:space-y-1">
        {children}
      </main>
      <LegalFooter />
    </div>
  );
}
