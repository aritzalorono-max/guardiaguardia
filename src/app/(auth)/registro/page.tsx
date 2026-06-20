"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Field, SubmitButton, Alert } from "@/components/ui/form";

export default function RegistroPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      setLoading(false);
      return;
    }
    if (!accepted) {
      setError("Debes aceptar las condiciones de uso y la política de privacidad.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/app`,
        data: { terms_accepted_at: new Date().toISOString() },
      },
    });

    if (error) {
      setError(
        error.message.includes("already registered")
          ? "Ya existe una cuenta con este email. Prueba a iniciar sesión."
          : "No hemos podido crear la cuenta. Inténtalo de nuevo.",
      );
      setLoading(false);
      return;
    }

    // Si el proyecto no exige confirmación por email, ya hay sesión.
    if (data.session) {
      router.push("/app");
      router.refresh();
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <>
        <h1 className="text-xl font-semibold text-slate-900">
          Revisa tu correo
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Te hemos enviado un email a <strong>{email}</strong> para confirmar tu
          cuenta. Haz clic en el enlace y volverás aquí para empezar.
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
      <h1 className="text-xl font-semibold text-slate-900">Crear servicio</h1>
      <p className="mt-1 text-sm text-slate-500">
        Crea tu cuenta de administrador. Después configuraremos tu servicio.
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
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
        />
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span>
            He leído y acepto las{" "}
            <Link
              href="/legal/condiciones"
              target="_blank"
              className="font-medium text-teal-700 hover:underline"
            >
              condiciones de uso
            </Link>{" "}
            y la{" "}
            <Link
              href="/legal/privacidad"
              target="_blank"
              className="font-medium text-teal-700 hover:underline"
            >
              política de privacidad
            </Link>
            .
          </span>
        </label>
        <SubmitButton loading={loading}>Crear cuenta</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-medium text-teal-700 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </>
  );
}
