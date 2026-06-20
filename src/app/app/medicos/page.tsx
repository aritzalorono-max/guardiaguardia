import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DoctorsManager } from "./doctors-manager";

export default async function MedicosPage() {
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("services")
    .select("id, has_residents")
    .limit(1);
  const service = services?.[0];
  if (!service) redirect("/onboarding");

  const { data: doctors } = await supabase
    .from("doctors")
    .select("*")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  return (
    <DoctorsManager
      serviceId={service.id}
      hasResidents={service.has_residents}
      initialDoctors={doctors ?? []}
    />
  );
}
