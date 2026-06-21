"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";

export type Member = {
  user_id: string;
  email: string;
  role: string;
  is_me: boolean;
};

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

export function AccountManager({
  email,
  initialMembers,
}: {
  email: string;
  initialMembers: Member[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  async function reloadMembers() {
    const { data } = await supabase.rpc("list_service_members");
    setMembers((data as unknown as Member[]) ?? []);
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setBusy(false);
    if (error) {
      toast.error("No se pudo cambiar el email. Revisa la dirección.");
      return;
    }
    setNewEmail("");
    toast.success("Te hemos enviado un correo al nuevo email para confirmarlo.");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) {
      toast.error("No se pudo cambiar la contraseña.");
      return;
    }
    setNewPassword("");
    toast.success("Contraseña actualizada.");
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.rpc("share_service", {
      p_email: inviteEmail.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error("No se pudo compartir el acceso.");
      return;
    }
    if (data === "no_user") {
      toast.error("Esa persona debe registrarse primero en GuardiaGuardia.");
      return;
    }
    if (data === "self") {
      toast.error("Ya tienes acceso con ese email.");
      return;
    }
    setInviteEmail("");
    await reloadMembers();
    toast.success("Acceso concedido.");
  }

  async function removeMember(userId: string) {
    if (!confirm("¿Quitar el acceso a esta persona?")) return;
    const { error } = await supabase.rpc("remove_member", { p_user_id: userId });
    if (error) {
      toast.error("No se pudo quitar el acceso.");
      return;
    }
    setMembers((m) => m.filter((x) => x.user_id !== userId));
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function deleteAccount() {
    if (confirmText !== "BORRAR") {
      toast.error('Escribe "BORRAR" para confirmar.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      setBusy(false);
      toast.error("No se pudo borrar la cuenta.");
      return;
    }
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Mi cuenta</h1>

      {/* Email */}
      <Card
        title="Email"
        description={`Tu email actual es ${email}. Al cambiarlo, te enviaremos un correo de confirmación.`}
      >
        <form onSubmit={changeEmail} className="flex flex-wrap items-end gap-3">
          <input
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="nuevo@email.com"
            className={`${inputCls} max-w-xs`}
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            Cambiar email
          </button>
        </form>
      </Card>

      {/* Contraseña */}
      <Card title="Contraseña">
        <form onSubmit={changePassword} className="flex flex-wrap items-end gap-3">
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nueva contraseña (mín. 8)"
            autoComplete="new-password"
            className={`${inputCls} max-w-xs`}
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            Cambiar contraseña
          </button>
        </form>
      </Card>

      {/* Compartir cuenta */}
      <Card
        title="Compartir acceso"
        description="Da acceso de administración a otras personas de tu servicio. Deben tener ya una cuenta registrada."
      >
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.user_id}
              className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
            >
              <span className="text-slate-700">
                {m.email}
                {m.is_me && (
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    tú
                  </span>
                )}
              </span>
              {!m.is_me && (
                <button
                  onClick={() => removeMember(m.user_id)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Quitar acceso
                </button>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={invite} className="mt-3 flex flex-wrap items-end gap-3">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@persona.com"
            className={`${inputCls} max-w-xs`}
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Dar acceso
          </button>
        </form>
      </Card>

      {/* Sesión */}
      <Card title="Sesión">
        <button
          onClick={signOut}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cerrar sesión
        </button>
      </Card>

      {/* Zona peligrosa */}
      <section className="rounded-xl border border-red-200 bg-red-50 p-5">
        <h2 className="font-semibold text-red-800">Borrar cuenta</h2>
        <p className="mt-1 text-sm text-red-700">
          Esta acción es irreversible. Se borrarán tu cuenta y los datos de tu
          servicio (médicos, calendario, guardias…) salvo que haya otros
          administradores, en cuyo caso solo se elimina tu acceso. Escribe{" "}
          <strong>BORRAR</strong> para confirmar.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="BORRAR"
            className="rounded-lg border border-red-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
          />
          <button
            onClick={deleteAccount}
            disabled={busy || confirmText !== "BORRAR"}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Borrar mi cuenta
          </button>
        </div>
      </section>
    </div>
  );
}
