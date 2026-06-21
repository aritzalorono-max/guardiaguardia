"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveEngineRules } from "@/lib/rules";
import {
  generateSchedule,
  assignSubstitutes,
  type DayCategory,
  type EngineDoctor,
  type EngineSlot,
  type OpenAssignment,
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
    supabase.from("day_types").select("id, allows_guard, needs_substitute"),
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

  // Ausencias: bloqueantes (no asignable) y de baja (asignable, necesita sustituto).
  const allowsGuard = new Map((dayTypeRows ?? []).map((t) => [t.id, t.allows_guard]));
  const needsSub = new Map((dayTypeRows ?? []).map((t) => [t.id, t.needs_substitute]));
  const blockedGuardDates = new Map<string, Set<string>>();
  const substituteNeeded = new Map<string, Set<string>>();
  const addTo = (map: Map<string, Set<string>>, doctorId: string, from: string, to: string) => {
    let set = map.get(doctorId);
    if (!set) {
      set = new Set();
      map.set(doctorId, set);
    }
    for (const date of eachDateInclusive(from, to)) set.add(date);
  };
  for (const a of absenceRows ?? []) {
    const from = a.start_date < periodStart ? periodStart : a.start_date;
    const to = a.end_date > periodEnd ? periodEnd : a.end_date;
    if (needsSub.get(a.day_type_id)) {
      addTo(substituteNeeded, a.doctor_id, from, to); // baja: asignable + sustituto
    } else if (!allowsGuard.get(a.day_type_id)) {
      addTo(blockedGuardDates, a.doctor_id, from, to); // no asignable
    }
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

  // Sustitutos para las guardias cuyo titular está de baja.
  const open: OpenAssignment[] = result.assignments.map((a, i) => ({
    id: String(i),
    date: a.date,
    category: a.category,
    modality: a.modality,
    eligible: a.eligible,
    doctorId: a.doctorId,
  }));
  const subs = assignSubstitutes({
    assignments: open,
    doctors,
    rules,
    blockedGuardDates,
    substituteNeeded,
  });
  const subById = new Map(subs.map((s) => [s.id, s.substituteId]));

  // Guardar ciclo + asignaciones de forma ATÓMICA (una sola transacción).
  const payload = result.assignments.map((a, i) => ({
    date: a.date,
    category: a.category,
    modality: a.modality,
    eligible: a.eligible,
    doctor_id: a.doctorId,
    substitute_doctor_id: subById.get(String(i)) ?? null,
  }));

  const { data: cycleId, error } = await supabase.rpc(
    "create_cycle_with_assignments",
    {
      p_service_id: service.id,
      p_name: name,
      p_start_year: startYear,
      p_start_month: startMonth,
      p_months: months,
      p_assignments: payload,
    },
  );

  if (error || !cycleId) throw new Error("No se pudo crear el reparto");

  redirect(`/app/guardias/${cycleId}`);
}

export async function deleteCycle(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("cycleId") as string;
  await supabase.from("cycles").delete().eq("id", id);
  redirect("/app/guardias");
}
