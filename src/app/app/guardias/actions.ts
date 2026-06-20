"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveEngineRules } from "@/lib/rules";
import {
  generateSchedule,
  type DayCategory,
  type EngineDoctor,
  type EngineSlot,
} from "@/lib/engine/schedule";

const pad = (n: number) => String(n).padStart(2, "0");

function eachDateInclusive(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start + "T00:00:00Z");
  const e = new Date(end + "T00:00:00Z");
  for (let t = s; t <= e; t = new Date(t.getTime() + 86_400_000)) {
    out.push(t.toISOString().slice(0, 10));
  }
  return out;
}

export async function generateCycle(formData: FormData) {
  const supabase = await createClient();

  const { data: services } = await supabase.from("services").select("id").limit(1);
  const service = services?.[0];
  if (!service) redirect("/onboarding");

  const startYear = Number(formData.get("startYear"));
  const startMonth = Number(formData.get("startMonth")); // 0-based
  const months = Number(formData.get("months"));
  const name = (formData.get("name") as string)?.trim() || null;

  const periodStart = `${startYear}-${pad(startMonth + 1)}-01`;
  const endDate = new Date(Date.UTC(startYear, startMonth + months, 0)); // último día
  const periodEnd = endDate.toISOString().slice(0, 10);

  // Datos del servicio.
  const [
    { data: doctorsRows },
    { data: slotRows },
    { data: ruleRows },
    { data: dayTypeRows },
    { data: absenceRows },
    { data: holidayRows },
    { data: prevAssignments },
  ] = await Promise.all([
    supabase
      .from("doctors")
      .select("id, kind, does_guards, is_active, part_time"),
    supabase.from("guard_slots").select("day_category, modality, eligible, weight"),
    supabase.from("service_rules").select("rule_key, enabled, value"),
    supabase.from("day_types").select("id, allows_guard"),
    supabase
      .from("absences")
      .select("doctor_id, start_date, end_date, day_type_id")
      .lte("start_date", periodEnd)
      .gte("end_date", periodStart),
    supabase
      .from("holidays")
      .select("date")
      .gte("date", periodStart)
      .lte("date", periodEnd),
    supabase
      .from("guard_assignments")
      .select("doctor_id, category")
      .lt("date", periodStart)
      .not("doctor_id", "is", null),
  ]);

  const doctors: EngineDoctor[] = (doctorsRows ?? []).map((d) => ({
    id: d.id,
    kind: d.kind,
    doesGuards: d.does_guards,
    isActive: d.is_active,
    partTime: d.part_time,
  }));

  const slots: EngineSlot[] = (slotRows ?? []).map((s) => ({
    category: s.day_category,
    modality: s.modality,
    eligible: s.eligible,
    weight: Number(s.weight),
  }));

  const rules = resolveEngineRules(ruleRows ?? []);

  // Ausencias que bloquean guardia (según el tipo de día).
  const allowsGuard = new Map((dayTypeRows ?? []).map((t) => [t.id, t.allows_guard]));
  const blockedGuardDates = new Map<string, Set<string>>();
  for (const a of absenceRows ?? []) {
    if (allowsGuard.get(a.day_type_id)) continue; // ese tipo permite guardia
    const from = a.start_date < periodStart ? periodStart : a.start_date;
    const to = a.end_date > periodEnd ? periodEnd : a.end_date;
    let set = blockedGuardDates.get(a.doctor_id);
    if (!set) {
      set = new Set();
      blockedGuardDates.set(a.doctor_id, set);
    }
    for (const date of eachDateInclusive(from, to)) set.add(date);
  }

  const holidays = new Set((holidayRows ?? []).map((h) => h.date));

  // Histórico de ciclos anteriores.
  const history = new Map<string, Partial<Record<DayCategory, number>>>();
  for (const a of prevAssignments ?? []) {
    if (!a.doctor_id) continue;
    const h = history.get(a.doctor_id) ?? {};
    h[a.category as DayCategory] = (h[a.category as DayCategory] ?? 0) + 1;
    history.set(a.doctor_id, h);
  }

  const result = generateSchedule({
    startYear,
    startMonth,
    months,
    holidays,
    doctors,
    slots,
    blockedGuardDates,
    rules,
    history,
  });

  // Guardar ciclo + asignaciones.
  const { data: cycle } = await supabase
    .from("cycles")
    .insert({
      service_id: service.id,
      name,
      start_year: startYear,
      start_month: startMonth,
      months,
      status: "draft",
    })
    .select("id")
    .single();

  if (!cycle) throw new Error("No se pudo crear el ciclo");

  if (result.assignments.length > 0) {
    const rows = result.assignments.map((a) => ({
      service_id: service.id,
      cycle_id: cycle.id,
      date: a.date,
      category: a.category,
      modality: a.modality,
      eligible: a.eligible,
      doctor_id: a.doctorId,
    }));
    // Inserción por lotes para no exceder límites.
    for (let i = 0; i < rows.length; i += 500) {
      await supabase.from("guard_assignments").insert(rows.slice(i, i + 500));
    }
  }

  redirect(`/app/guardias/${cycle.id}`);
}

export async function deleteCycle(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("cycleId") as string;
  await supabase.from("cycles").delete().eq("id", id);
  redirect("/app/guardias");
}
