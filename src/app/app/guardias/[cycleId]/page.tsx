import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolveEngineRules } from "@/lib/rules";
import { deleteCycle } from "../actions";
import { CycleView } from "./cycle-view";
import { ShareSection } from "./share-section";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const pad = (n: number) => String(n).padStart(2, "0");

function eachDateInclusive(start: string, end: string): string[] {
  const out: string[] = [];
  for (
    let t = new Date(start + "T00:00:00Z");
    t <= new Date(end + "T00:00:00Z");
    t = new Date(t.getTime() + 86_400_000)
  )
    out.push(t.toISOString().slice(0, 10));
  return out;
}

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  const { cycleId } = await params;
  const supabase = await createClient();

  const [{ data: services }, { data: userData }] = await Promise.all([
    supabase.from("services").select("id").limit(1),
    supabase.auth.getUser(),
  ]);
  if (!services?.[0]) redirect("/onboarding");
  const serviceId = services[0].id;

  const { data: cycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("id", cycleId)
    .single();
  if (!cycle) notFound();

  const periodStart = `${cycle.start_year}-${pad(cycle.start_month + 1)}-01`;
  const periodEnd = new Date(Date.UTC(cycle.start_year, cycle.start_month + cycle.months, 0))
    .toISOString()
    .slice(0, 10);

  const [
    { data: assignments },
    { data: doctors },
    { data: ruleRows },
    { data: dayTypeRows },
    { data: absenceRows },
    { data: auditRows },
    { data: leaveRows },
    { data: shareRows },
  ] = await Promise.all([
    supabase
      .from("guard_assignments")
      .select("id, date, category, modality, eligible, doctor_id, manual")
      .eq("cycle_id", cycleId)
      .order("date", { ascending: true }),
    supabase.from("doctors").select("id, first_name, last_name, kind, does_guards, is_active"),
    supabase.from("service_rules").select("rule_key, enabled, value"),
    supabase.from("day_types").select("id, allows_guard"),
    supabase
      .from("absences")
      .select("doctor_id, start_date, end_date, day_type_id")
      .lte("start_date", periodEnd)
      .gte("end_date", periodStart),
    supabase
      .from("assignment_audit")
      .select("id, date, actor_email, old_doctor_id, new_doctor_id, created_at")
      .eq("cycle_id", cycleId)
      .order("created_at", { ascending: false }),
    supabase
      .from("cycle_leaves")
      .select("id, doctor_id, start_date, end_date, note")
      .eq("cycle_id", cycleId)
      .order("start_date", { ascending: true }),
    supabase
      .from("share_links")
      .select("id, token, expires_at")
      .eq("cycle_id", cycleId)
      .order("created_at", { ascending: false }),
  ]);

  const rules = resolveEngineRules(ruleRows ?? []);

  const allowsGuard = new Map((dayTypeRows ?? []).map((t) => [t.id, t.allows_guard]));
  const blocked: Record<string, string[]> = {};
  for (const a of absenceRows ?? []) {
    if (allowsGuard.get(a.day_type_id)) continue;
    const from = a.start_date < periodStart ? periodStart : a.start_date;
    const to = a.end_date > periodEnd ? periodEnd : a.end_date;
    (blocked[a.doctor_id] ??= []).push(...eachDateInclusive(from, to));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/app/guardias" className="text-sm text-teal-700 hover:underline">
            ‹ Volver a Guardias
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {cycle.name || `${MONTHS[cycle.start_month]} ${cycle.start_year}`}
          </h1>
          <p className="text-slate-500">
            {MONTHS[cycle.start_month]} {cycle.start_year} · {cycle.months}{" "}
            {cycle.months === 1 ? "mes" : "meses"}
          </p>
        </div>
        <form action={deleteCycle}>
          <input type="hidden" name="cycleId" value={cycleId} />
          <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
            Eliminar reparto
          </button>
        </form>
      </div>

      <div className="mt-4">
        <CycleView
          cycle={cycle}
          serviceId={serviceId}
          actorEmail={userData.user?.email ?? ""}
          doctors={doctors ?? []}
          initialAssignments={assignments ?? []}
          initialAudit={auditRows ?? []}
          initialLeaves={leaveRows ?? []}
          rules={rules}
          blocked={blocked}
        />
        <ShareSection
          cycleId={cycleId}
          serviceId={serviceId}
          initialLinks={shareRows ?? []}
        />
      </div>
    </div>
  );
}
