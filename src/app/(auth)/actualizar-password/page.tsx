"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, SubmitButton, Alert } from "@/components/ui/form";

export default function ActualizarPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError("No hemos podido actualizar la contraseña. Pide otro enlace.");
      setLoading(false);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">
        Nueva contraseña
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Escribe tu nueva contraseña para acceder.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field
          label="Nueva contraseña"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
        />
        <SubmitButton loading={loading}>Guardar contraseña</SubmitButton>
      </form>
    </>
  );
}
