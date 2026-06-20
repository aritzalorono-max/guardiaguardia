"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Field, SubmitButton, Alert } from "@/components/ui/form";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/actualizar-password`,
    });
    if (error) {
      setError("No hemos podido enviar el correo. Inténtalo de nuevo.");
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <>
        <h1 className="text-xl font-semibold text-slate-900">Correo enviado</h1>
        <p className="mt-3 text-sm text-slate-600">
          Si existe una cuenta con <strong>{email}</strong>, recibirás un email
          con un enlace para crear una nueva contraseña.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-teal-700 hover:underline"
        >
          Volver a entrar
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">
        Recuperar contraseña
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Te enviaremos un enlace para crear una nueva contraseña.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <SubmitButton loading={loading}>Enviar enlace</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-teal-700 hover:underline">
          Volver a entrar
        </Link>
      </p>
    </>
  );
}
