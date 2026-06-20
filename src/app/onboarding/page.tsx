import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Si ya tiene un servicio configurado, al panel.
  const { data: services } = await supabase.from("services").select("id");
  if ((services?.length ?? 0) > 0) redirect("/app");

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10">
      <div className="mb-8 flex items-center gap-2 text-lg font-semibold text-slate-900">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-600 text-white">
          G
        </span>
        GuardiaGuardia
      </div>
      <OnboardingForm />
    </div>
  );
}
