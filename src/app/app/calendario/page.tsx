import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarManager } from "./calendar-manager";

export default async function CalendarioPage() {
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("services")
    .select("id")
    .limit(1);
  const service = services?.[0];
  if (!service) redirect("/onboarding");

  const [{ data: doctors }, { data: dayTypes }, { data: holidays }, { data: seeded }] =
    await Promise.all([
      supabase
        .from("doctors")
        .select("id, first_name, last_name, kind, resident_level")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true }),
      supabase
        .from("day_types")
        .select("id, name, color, counts_as_worked, allows_guard")
        .order("created_at", { ascending: true }),
      supabase.from("holidays").select("id, date, name, is_festivo"),
      supabase.from("seeded_holiday_years").select("year"),
    ]);

  return (
    <CalendarManager
      serviceId={service.id}
      doctors={doctors ?? []}
      dayTypes={dayTypes ?? []}
      initialHolidays={holidays ?? []}
      initialSeededYears={(seeded ?? []).map((s) => s.year)}
    />
  );
}
