import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountManager, type Member } from "./account-manager";

export default async function CuentaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: members } = await supabase.rpc("list_service_members");

  return (
    <AccountManager
      email={user.email ?? ""}
      initialMembers={(members as unknown as Member[]) ?? []}
    />
  );
}
