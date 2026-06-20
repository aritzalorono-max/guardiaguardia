import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfigManager } from "./config-manager";

export default async function ConfiguracionPage() {
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("services")
    .select("id, has_residents")
    .limit(1);
  const service = services?.[0];
  if (!service) redirect("/onboarding");

  const [{ data: slots }, { data: rules }, { data: dayTypes }] =
    await Promise.all([
      supabase
        .from("guard_slots")
        .select("*")
        .order("day_category", { ascending: true })
        .order("position", { ascending: true }),
      supabase.from("service_rules").select("*"),
      supabase
        .from("day_types")
        .select("*")
        .order("created_at", { ascending: true }),
    ]);

  return (
    <ConfigManager
      serviceId={service.id}
      hasResidents={service.has_residents}
      initialSlots={slots ?? []}
      initialRules={rules ?? []}
      initialDayTypes={dayTypes ?? []}
    />
  );
}
