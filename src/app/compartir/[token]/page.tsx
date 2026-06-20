import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SharedCycle, type SharedData } from "./shared-cycle";

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-500">{text}</p>
      <Link href="/" className="mt-6 text-sm font-medium text-teal-700 hover:underline">
        Ir a GuardiaGuardia
      </Link>
    </div>
  );
}

export default async function SharedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_shared_cycle", { p_token: token });

  if (!data)
    return (
      <Message
        title="Enlace no válido"
        text="Este enlace no existe o ha sido revocado."
      />
    );

  const shared = data as unknown as SharedData;
  if (shared.expired)
    return (
      <Message
        title="Enlace caducado"
        text="Pide al administrador del servicio un enlace nuevo."
      />
    );

  return <SharedCycle data={shared} />;
}
