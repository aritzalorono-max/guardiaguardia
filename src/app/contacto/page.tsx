import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Contacto · GuardiaGuardia" };

export default function ContactoPage() {
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

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-900">Contacto</h1>
        <p className="mt-3 text-slate-600">
          ¿Tienes dudas, una incidencia o quieres proponer una mejora? Estaremos
          encantados de ayudarte.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">
            Correo de contacto
          </p>
          <a
            href={`mailto:${LEGAL.contactEmail}`}
            className="mt-1 inline-block text-lg font-semibold text-teal-700 hover:underline"
          >
            {LEGAL.contactEmail}
          </a>
          <p className="mt-4 text-sm text-slate-500">
            También puedes consultar nuestra{" "}
            <Link href="/legal/privacidad" className="text-teal-700 underline">
              política de privacidad
            </Link>{" "}
            y las{" "}
            <Link href="/legal/condiciones" className="text-teal-700 underline">
              condiciones de uso
            </Link>
            .
          </p>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
