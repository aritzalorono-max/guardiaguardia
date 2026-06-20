"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Field, SubmitButton, Alert } from "@/components/ui/form";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(
        error.message.includes("Invalid login")
          ? "Email o contraseña incorrectos."
          : error.message.includes("Email not confirmed")
            ? "Tienes que confirmar tu email antes de entrar. Revisa tu correo."
            : "No hemos podido iniciar sesión. Inténtalo de nuevo.",
      );
      setLoading(false);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Entrar</h1>
      <p className="mt-1 text-sm text-slate-500">
        Accede para gestionar las guardias de tu servicio.
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
        <Field
          label="Contraseña"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <div className="text-right">
          <Link
            href="/recuperar"
            className="text-sm font-medium text-teal-700 hover:underline"
          >
            ¿Has olvidado la contraseña?
          </Link>
        </div>
        <SubmitButton loading={loading}>Entrar</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        ¿No tienes cuenta?{" "}
        <Link
          href="/registro"
          className="font-medium text-teal-700 hover:underline"
        >
          Crear servicio
        </Link>
      </p>
    </>
  );
}
