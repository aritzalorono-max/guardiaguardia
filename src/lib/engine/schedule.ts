/**
 * Motor de reparto de guardias (puro, sin dependencias de UI ni base de datos).
 *
 * Objetivo: que todos hagan el MISMO número de cada tipo de guardia
 * (laborable / víspera / festivo y, dentro de cada uno, por modalidad y
 * elegibilidad), respetando las reglas duras, teniendo en cuenta el histórico
 * y repartiendo en el tiempo.
 *
 * Estrategia (greedy + prioridad):
 *  - Se procesan primero los días difíciles (festivo, luego víspera, luego
 *    laborable), porque tienen menos gente disponible.
 *  - Cada puesto se asigna al médico elegible y disponible que va MÁS por
 *    detrás de su cuota en esa "vía" (tipo de guardia), desempatando por quien
 *    hizo menos históricamente y quien lleva más tiempo sin guardia.
 *  - Si un puesto no se puede cubrir sin romper una regla dura, se deja como
 *    hueco (nunca un reparto inválido en silencio).
 */

export type DayCategory = "laborable" | "vispera" | "festivo";
export type Modality = "presencial" | "localizada" | "telefonica";
export type Eligibility = "cualquiera" | "adjunto" | "residente";
export type DoctorKind = "adjunto" | "residente";

export interface EngineDoctor {
  id: string;
  kind: DoctorKind;
  doesGuards: boolean;
  isActive: boolean;
  partTime: boolean;
}

export interface EngineSlot {
  category: DayCategory;
  modality: Modality;
  eligible: Eligibility;
  weight: number;
}

export interface EngineRules {
  noConsecutive: boolean;
  freeDayAfter: boolean;
  rest12h: boolean;
  noTwoWeekends: boolean;
  minDaysBetween: number | null;
  maxPerMonthResident: number | null;
  maxPerMonthAdjunto: number | null;
  presencialOnlyResidents: boolean;
  localizadaOnlyAdjuntos: boolean;
  partTimeNoPenalty: boolean;
  considerHistory: boolean;
}

export const DEFAULT_RULES: EngineRules = {
  noConsecutive: true,
  freeDayAfter: true,
  rest12h: true,
  noTwoWeekends: true,
  minDaysBetween: null,
  maxPerMonthResident: null,
  maxPerMonthAdjunto: null,
  presencialOnlyResidents: false,
  localizadaOnlyAdjuntos: false,
  partTimeNoPenalty: true,
  considerHistory: true,
};

export interface EngineInput {
  startYear: number;
  startMonth: number; // 0-based
  months: number;
  /** Festivos 'YYYY-MM-DD' (los fines de semana se detectan solos). */
  holidays: Set<string>;
  doctors: EngineDoctor[];
  slots: EngineSlot[];
  /** doctorId -> fechas 'YYYY-MM-DD' en las que NO puede hacer guardia. */
  blockedGuardDates: Map<string, Set<string>>;
  rules: EngineRules;
  /** Histórico: doctorId -> guardias previas por categoría. */
  history?: Map<string, Partial<Record<DayCategory, number>>>;
}

export interface Assignment {
  date: string;
  category: DayCategory;
  modality: Modality;
  eligible: Eligibility;
  doctorId: string | null; // null = hueco
}

export interface DoctorSummary {
  total: number;
  byCategory: Record<DayCategory, number>;
}

export interface EngineResult {
  assignments: Assignment[];
  gaps: { date: string; category: DayCategory; modality: Modality; reason: string }[];
  perDoctor: Record<string, DoctorSummary>;
  warnings: string[];
}

// ----------------------- utilidades de fecha -----------------------

const DAY_MS = 86_400_000;

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmt(d: Date) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function daysSinceEpoch(d: Date) {
  return Math.floor(d.getTime() / DAY_MS);
}

interface DayInfo {
  date: string;
  category: DayCategory;
  monthKey: string;
  epoch: number;
  /** id del fin de semana (sábado) si el día es viernes/sábado/domingo; si no, null */
  weekendId: number | null;
}

function buildDays(input: EngineInput): DayInfo[] {
  const { startYear, startMonth, months, holidays } = input;
  const start = new Date(Date.UTC(startYear, startMonth, 1));
  const end = new Date(Date.UTC(startYear, startMonth + months, 1));

  const isFestivo = (d: Date) => {
    const wd = d.getUTCDay();
    return wd === 0 || wd === 6 || holidays.has(fmt(d));
  };

  const days: DayInfo[] = [];
  for (let t = new Date(start); t < end; t = new Date(t.getTime() + DAY_MS)) {
    const date = fmt(t);
    const next = new Date(t.getTime() + DAY_MS);
    let category: DayCategory;
    if (isFestivo(t)) category = "festivo";
    else if (isFestivo(next)) category = "vispera";
    else category = "laborable";

    const wd = t.getUTCDay();
    let weekendId: number | null = null;
    if (wd === 5) weekendId = daysSinceEpoch(t) + 1; // viernes -> sábado
    else if (wd === 6) weekendId = daysSinceEpoch(t);
    else if (wd === 0) weekendId = daysSinceEpoch(t) - 1;

    days.push({
      date,
      category,
      monthKey: date.slice(0, 7),
      epoch: daysSinceEpoch(t),
      weekendId,
    });
  }
  return days;
}

// ----------------------- elegibilidad -----------------------

function laneKey(s: { category: DayCategory; modality: Modality; eligible: Eligibility }) {
  return `${s.category}|${s.modality}|${s.eligible}`;
}

function canCover(
  doctor: EngineDoctor,
  modality: Modality,
  eligible: Eligibility,
  rules: EngineRules,
): boolean {
  if (eligible === "adjunto" && doctor.kind !== "adjunto") return false;
  if (eligible === "residente" && doctor.kind !== "residente") return false;
  if (rules.presencialOnlyResidents && modality === "presencial" && doctor.kind !== "residente")
    return false;
  if (rules.localizadaOnlyAdjuntos && modality === "localizada" && doctor.kind !== "adjunto")
    return false;
  return true;
}

// ----------------------- motor -----------------------

export function generateSchedule(input: EngineInput): EngineResult {
  const rules = input.rules;
  const days = buildDays(input);
  const totalDays = days.length;
  const warnings: string[] = [];

  const candidates = input.doctors.filter((d) => d.doesGuards && d.isActive);

  // Puestos por categoría (la plantilla se aplica cada día de esa categoría).
  const slotsByCategory: Record<DayCategory, EngineSlot[]> = {
    laborable: [],
    vispera: [],
    festivo: [],
  };
  for (const s of input.slots) slotsByCategory[s.category].push(s);

  // Días por categoría.
  const dayCount: Record<DayCategory, number> = { laborable: 0, vispera: 0, festivo: 0 };
  for (const d of days) dayCount[d.category]++;

  // Peso de cada médico (disponibilidad * jornada).
  const blockedCount = (id: string) => input.blockedGuardDates.get(id)?.size ?? 0;
  const weightOf = (d: EngineDoctor) => {
    const avail = totalDays > 0 ? (totalDays - Math.min(blockedCount(d.id), totalDays)) / totalDays : 1;
    const part = d.partTime && !rules.partTimeNoPenalty ? 0.5 : 1;
    return avail * part;
  };

  // Vías (lanes): combinación categoría|modalidad|elegibilidad.
  const lanes = new Map<
    string,
    { category: DayCategory; modality: Modality; eligible: Eligibility; slotsPerDay: number }
  >();
  for (const cat of ["laborable", "vispera", "festivo"] as DayCategory[]) {
    for (const s of slotsByCategory[cat]) {
      const key = laneKey(s);
      const existing = lanes.get(key);
      if (existing) existing.slotsPerDay++;
      else
        lanes.set(key, {
          category: cat,
          modality: s.modality,
          eligible: s.eligible,
          slotsPerDay: 1,
        });
    }
  }

  // Objetivo (cuota) por vía y médico.
  const target = new Map<string, Map<string, number>>();
  const eligibleByLane = new Map<string, EngineDoctor[]>();
  for (const [key, lane] of lanes) {
    const elig = candidates.filter((d) => canCover(d, lane.modality, lane.eligible, rules));
    eligibleByLane.set(key, elig);
    const totalSlots = lane.slotsPerDay * dayCount[lane.category];
    const sumW = elig.reduce((a, d) => a + weightOf(d), 0);
    const m = new Map<string, number>();
    for (const d of elig) m.set(d.id, sumW > 0 ? (totalSlots * weightOf(d)) / sumW : 0);
    target.set(key, m);
    if (elig.length === 0 && totalSlots > 0)
      warnings.push(
        `No hay médicos elegibles para ${lane.modality} (${lane.eligible}) en días ${lane.category}.`,
      );
  }

  // Estado.
  const count = new Map<string, Map<string, number>>(); // laneKey -> doctorId -> n
  for (const key of lanes.keys()) count.set(key, new Map());
  const catCount = new Map<string, Record<DayCategory, number>>();
  const monthCount = new Map<string, Map<string, number>>(); // doctorId -> monthKey -> n
  const assignedDates = new Map<string, Set<number>>(); // doctorId -> epochs
  const lastGuard = new Map<string, number>(); // doctorId -> epoch
  const weekendIds = new Map<string, Set<number>>();
  const totalAssigned = new Map<string, number>();

  for (const d of candidates) {
    const hist = input.history?.get(d.id);
    catCount.set(d.id, {
      laborable: (rules.considerHistory && hist?.laborable) || 0,
      vispera: (rules.considerHistory && hist?.vispera) || 0,
      festivo: (rules.considerHistory && hist?.festivo) || 0,
    });
    monthCount.set(d.id, new Map());
    assignedDates.set(d.id, new Set());
    weekendIds.set(d.id, new Set());
    totalAssigned.set(d.id, 0);
  }

  // Separación mínima entre guardias (en diferencia de días).
  const baseGap = rules.noConsecutive || rules.freeDayAfter || rules.rest12h ? 2 : 1;
  const gapDiff = Math.max(baseGap, rules.minDaysBetween ?? 1);

  const capFor = (d: EngineDoctor) =>
    d.kind === "residente" ? rules.maxPerMonthResident : rules.maxPerMonthAdjunto;

  // Orden de proceso: festivo, víspera, laborable; dentro, por fecha.
  const catPriority: Record<DayCategory, number> = { festivo: 0, vispera: 1, laborable: 2 };
  const orderedDays = [...days].sort(
    (a, b) => catPriority[a.category] - catPriority[b.category] || a.epoch - b.epoch,
  );

  const assignments: Assignment[] = [];
  const gaps: EngineResult["gaps"] = [];

  for (const day of orderedDays) {
    const slots = slotsByCategory[day.category];
    // Puestos más restrictivos primero (menos candidatos posibles).
    const orderedSlots = [...slots].sort(
      (a, b) =>
        (eligibleByLane.get(laneKey(a))?.length ?? 0) -
        (eligibleByLane.get(laneKey(b))?.length ?? 0),
    );

    for (const slot of orderedSlots) {
      const key = laneKey(slot);
      const elig = eligibleByLane.get(key) ?? [];

      const available = elig.filter((d) => {
        if (input.blockedGuardDates.get(d.id)?.has(day.date)) return false;
        // separación / no consecutivas
        const dates = assignedDates.get(d.id)!;
        for (let off = 1; off < gapDiff; off++) {
          if (dates.has(day.epoch - off) || dates.has(day.epoch + off)) return false;
        }
        // no dos findes seguidos
        if (rules.noTwoWeekends && day.weekendId != null) {
          const w = weekendIds.get(d.id)!;
          if (w.has(day.weekendId - 7) || w.has(day.weekendId + 7)) return false;
        }
        // tope mensual
        const cap = capFor(d);
        if (cap != null && (monthCount.get(d.id)!.get(day.monthKey) ?? 0) >= cap) return false;
        return true;
      });

      if (available.length === 0) {
        gaps.push({
          date: day.date,
          category: day.category,
          modality: slot.modality,
          reason: elig.length === 0 ? "sin médicos elegibles" : "sin médicos disponibles",
        });
        assignments.push({
          date: day.date,
          category: day.category,
          modality: slot.modality,
          eligible: slot.eligible,
          doctorId: null,
        });
        continue;
      }

      const laneTarget = target.get(key)!;
      const laneCount = count.get(key)!;

      available.sort((a, b) => {
        const behindA = (laneTarget.get(a.id) ?? 0) - (laneCount.get(a.id) ?? 0);
        const behindB = (laneTarget.get(b.id) ?? 0) - (laneCount.get(b.id) ?? 0);
        if (behindB !== behindA) return behindB - behindA; // más por detrás primero
        const catA = catCount.get(a.id)![day.category];
        const catB = catCount.get(b.id)![day.category];
        if (catA !== catB) return catA - catB; // menos histórico+actual de esa categoría
        const lgA = lastGuard.get(a.id) ?? -Infinity;
        const lgB = lastGuard.get(b.id) ?? -Infinity;
        if (lgA !== lgB) return lgA - lgB; // lleva más sin guardia
        const tA = totalAssigned.get(a.id)!;
        const tB = totalAssigned.get(b.id)!;
        if (tA !== tB) return tA - tB;
        return a.id < b.id ? -1 : 1;
      });

      const chosen = available[0];
      assignments.push({
        date: day.date,
        category: day.category,
        modality: slot.modality,
        eligible: slot.eligible,
        doctorId: chosen.id,
      });

      laneCount.set(chosen.id, (laneCount.get(chosen.id) ?? 0) + 1);
      catCount.get(chosen.id)![day.category]++;
      totalAssigned.set(chosen.id, totalAssigned.get(chosen.id)! + 1);
      monthCount.get(chosen.id)!.set(day.monthKey, (monthCount.get(chosen.id)!.get(day.monthKey) ?? 0) + 1);
      assignedDates.get(chosen.id)!.add(day.epoch);
      lastGuard.set(chosen.id, day.epoch);
      if (day.weekendId != null) weekendIds.get(chosen.id)!.add(day.weekendId);
    }
  }

  // Optimización (Fase C): igualar al máximo el nº de guardias por vía
  // mediante intercambios, sin romper ninguna regla dura.
  balanceLanes(assignments, eligibleByLane, rules, input.blockedGuardDates);

  // Resumen por médico (a partir del resultado final).
  const perDoctor: Record<string, DoctorSummary> = {};
  for (const d of candidates)
    perDoctor[d.id] = {
      total: 0,
      byCategory: { laborable: 0, vispera: 0, festivo: 0 },
    };
  for (const a of assignments) {
    if (a.doctorId && perDoctor[a.doctorId]) {
      perDoctor[a.doctorId].byCategory[a.category]++;
      perDoctor[a.doctorId].total++;
    }
  }

  if (gaps.length > 0)
    warnings.push(`Quedaron ${gaps.length} puesto(s) sin cubrir (huecos).`);

  // Orden cronológico final.
  assignments.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return { assignments, gaps, perDoctor, warnings };
}

/**
 * Equilibra el número de guardias por vía (categoría+modalidad+elegibilidad)
 * mediante intercambios: mueve guardias del médico que más tiene al que menos,
 * siempre que el receptor cumpla todas las reglas duras. Reduce la diferencia
 * a 1 como máximo en cada vía cuando la disponibilidad lo permite.
 */
function balanceLanes(
  assignments: Assignment[],
  eligibleByLane: Map<string, EngineDoctor[]>,
  rules: EngineRules,
  blockedGuardDates: Map<string, Set<string>>,
) {
  const baseGap = rules.noConsecutive || rules.freeDayAfter || rules.rest12h ? 2 : 1;
  const gapDiff = Math.max(baseGap, rules.minDaysBetween ?? 1);

  const canAssign = (doc: EngineDoctor, date: string, exclude: Assignment): boolean => {
    if (blockedGuardDates.get(doc.id)?.has(date)) return false;
    const info = infoFromDate(date);
    let monthN = 0;
    for (const a of assignments) {
      if (a.doctorId !== doc.id || a === exclude) continue;
      if (a.date === date) return false;
      const e2 = infoFromDate(a.date);
      if (Math.abs(e2.epoch - info.epoch) < gapDiff) return false;
      if (
        rules.noTwoWeekends &&
        info.weekendId != null &&
        e2.weekendId != null &&
        Math.abs(e2.weekendId - info.weekendId) === 7
      )
        return false;
      if (a.date.slice(0, 7) === info.monthKey) monthN++;
    }
    const cap = doc.kind === "residente" ? rules.maxPerMonthResident : rules.maxPerMonthAdjunto;
    if (cap != null && monthN >= cap) return false;
    return true;
  };

  for (const [key, elig] of eligibleByLane) {
    if (elig.length < 2) continue;
    const laneAssignments = assignments.filter(
      (a) => a.doctorId != null && `${a.category}|${a.modality}|${a.eligible}` === key,
    );
    if (laneAssignments.length === 0) continue;

    const count = new Map<string, number>();
    for (const d of elig) count.set(d.id, 0);
    for (const a of laneAssignments)
      count.set(a.doctorId!, (count.get(a.doctorId!) ?? 0) + 1);

    const maxIter = laneAssignments.length * elig.length + 10;
    let iter = 0;
    let moved = true;
    while (moved && iter++ < maxIter) {
      moved = false;
      const desc = [...elig].sort((a, b) => (count.get(b.id) ?? 0) - (count.get(a.id) ?? 0));
      const asc = [...desc].reverse();
      outer: for (const hi of desc) {
        for (const lo of asc) {
          if ((count.get(hi.id) ?? 0) - (count.get(lo.id) ?? 0) <= 1) continue;
          for (const s of laneAssignments) {
            if (s.doctorId !== hi.id) continue;
            if (canAssign(lo, s.date, s)) {
              s.doctorId = lo.id;
              count.set(hi.id, count.get(hi.id)! - 1);
              count.set(lo.id, (count.get(lo.id) ?? 0) + 1);
              moved = true;
              break outer;
            }
          }
        }
      }
    }
  }
}

// ============================================================
// Rellenar SOLO los huecos de un reparto existente (Fase 8).
// Mantiene fijas las guardias ya asignadas y cubre las vacías
// respetando reglas, equidad y disponibilidad.
// ============================================================

export interface OpenAssignment {
  id: string;
  date: string;
  category: DayCategory;
  modality: Modality;
  eligible: Eligibility;
  doctorId: string | null;
}

export interface FillResult {
  filled: { id: string; doctorId: string }[];
  remainingGaps: number;
}

function infoFromDate(date: string) {
  const epoch = Math.floor(Date.parse(date + "T00:00:00Z") / DAY_MS);
  const wd = new Date(date + "T00:00:00Z").getUTCDay();
  let weekendId: number | null = null;
  if (wd === 5) weekendId = epoch + 1;
  else if (wd === 6) weekendId = epoch;
  else if (wd === 0) weekendId = epoch - 1;
  return { epoch, weekendId, monthKey: date.slice(0, 7) };
}

export function fillOpenSlots(params: {
  assignments: OpenAssignment[];
  doctors: EngineDoctor[];
  rules: EngineRules;
  blockedGuardDates: Map<string, Set<string>>;
  history?: Map<string, Partial<Record<DayCategory, number>>>;
}): FillResult {
  const { rules } = params;
  const candidates = params.doctors.filter((d) => d.doesGuards && d.isActive);
  const allDates = new Set(params.assignments.map((a) => a.date));
  const totalDays = allDates.size;

  const blockedCount = (id: string) => params.blockedGuardDates.get(id)?.size ?? 0;
  const weightOf = (d: EngineDoctor) => {
    const avail = totalDays > 0 ? (totalDays - Math.min(blockedCount(d.id), totalDays)) / totalDays : 1;
    return avail * (d.partTime && !rules.partTimeNoPenalty ? 0.5 : 1);
  };

  // Vías y nº total de puestos por vía.
  const laneTotal = new Map<string, number>();
  for (const a of params.assignments) {
    const k = laneKey(a);
    laneTotal.set(k, (laneTotal.get(k) ?? 0) + 1);
  }
  const eligibleByLane = new Map<string, EngineDoctor[]>();
  const target = new Map<string, Map<string, number>>();
  for (const [k, total] of laneTotal) {
    const [, modality, eligible] = k.split("|") as [DayCategory, Modality, Eligibility];
    const elig = candidates.filter((d) => canCover(d, modality, eligible, rules));
    eligibleByLane.set(k, elig);
    const sumW = elig.reduce((a, d) => a + weightOf(d), 0);
    const m = new Map<string, number>();
    for (const d of elig) m.set(d.id, sumW > 0 ? (total * weightOf(d)) / sumW : 0);
    target.set(k, m);
  }

  // Estado.
  const laneCount = new Map<string, Map<string, number>>();
  for (const k of laneTotal.keys()) laneCount.set(k, new Map());
  const catCount = new Map<string, Record<DayCategory, number>>();
  const monthCount = new Map<string, Map<string, number>>();
  const assignedDates = new Map<string, Set<number>>();
  const lastGuard = new Map<string, number>();
  const weekendIds = new Map<string, Set<number>>();
  const totalAssigned = new Map<string, number>();
  for (const d of candidates) {
    const hist = params.history?.get(d.id);
    catCount.set(d.id, {
      laborable: (rules.considerHistory && hist?.laborable) || 0,
      vispera: (rules.considerHistory && hist?.vispera) || 0,
      festivo: (rules.considerHistory && hist?.festivo) || 0,
    });
    monthCount.set(d.id, new Map());
    assignedDates.set(d.id, new Set());
    weekendIds.set(d.id, new Set());
    totalAssigned.set(d.id, 0);
  }

  // Sembrar con lo ya asignado.
  for (const a of params.assignments) {
    if (!a.doctorId || !catCount.has(a.doctorId)) continue;
    const info = infoFromDate(a.date);
    const k = laneKey(a);
    laneCount.get(k)!.set(a.doctorId, (laneCount.get(k)!.get(a.doctorId) ?? 0) + 1);
    catCount.get(a.doctorId)![a.category]++;
    totalAssigned.set(a.doctorId, totalAssigned.get(a.doctorId)! + 1);
    monthCount.get(a.doctorId)!.set(info.monthKey, (monthCount.get(a.doctorId)!.get(info.monthKey) ?? 0) + 1);
    assignedDates.get(a.doctorId)!.add(info.epoch);
    lastGuard.set(a.doctorId, Math.max(lastGuard.get(a.doctorId) ?? -Infinity, info.epoch));
    if (info.weekendId != null) weekendIds.get(a.doctorId)!.add(info.weekendId);
  }

  const baseGap = rules.noConsecutive || rules.freeDayAfter || rules.rest12h ? 2 : 1;
  const gapDiff = Math.max(baseGap, rules.minDaysBetween ?? 1);
  const capFor = (d: EngineDoctor) =>
    d.kind === "residente" ? rules.maxPerMonthResident : rules.maxPerMonthAdjunto;
  const catPriority: Record<DayCategory, number> = { festivo: 0, vispera: 1, laborable: 2 };

  const open = params.assignments
    .filter((a) => !a.doctorId)
    .sort((a, b) => catPriority[a.category] - catPriority[b.category] || (a.date < b.date ? -1 : 1));

  const filled: { id: string; doctorId: string }[] = [];
  let remainingGaps = 0;

  for (const slot of open) {
    const info = infoFromDate(slot.date);
    const k = laneKey(slot);
    const elig = eligibleByLane.get(k) ?? [];

    const available = elig.filter((d) => {
      if (params.blockedGuardDates.get(d.id)?.has(slot.date)) return false;
      const dates = assignedDates.get(d.id)!;
      for (let off = 1; off < gapDiff; off++)
        if (dates.has(info.epoch - off) || dates.has(info.epoch + off)) return false;
      if (rules.noTwoWeekends && info.weekendId != null) {
        const w = weekendIds.get(d.id)!;
        if (w.has(info.weekendId - 7) || w.has(info.weekendId + 7)) return false;
      }
      const cap = capFor(d);
      if (cap != null && (monthCount.get(d.id)!.get(info.monthKey) ?? 0) >= cap) return false;
      return true;
    });

    if (available.length === 0) {
      remainingGaps++;
      continue;
    }

    const laneTarget = target.get(k)!;
    const lc = laneCount.get(k)!;
    available.sort((a, b) => {
      const behindA = (laneTarget.get(a.id) ?? 0) - (lc.get(a.id) ?? 0);
      const behindB = (laneTarget.get(b.id) ?? 0) - (lc.get(b.id) ?? 0);
      if (behindB !== behindA) return behindB - behindA;
      const catA = catCount.get(a.id)![slot.category];
      const catB = catCount.get(b.id)![slot.category];
      if (catA !== catB) return catA - catB;
      const lgA = lastGuard.get(a.id) ?? -Infinity;
      const lgB = lastGuard.get(b.id) ?? -Infinity;
      if (lgA !== lgB) return lgA - lgB;
      const tA = totalAssigned.get(a.id)!;
      const tB = totalAssigned.get(b.id)!;
      if (tA !== tB) return tA - tB;
      return a.id < b.id ? -1 : 1;
    });

    const chosen = available[0];
    filled.push({ id: slot.id, doctorId: chosen.id });
    lc.set(chosen.id, (lc.get(chosen.id) ?? 0) + 1);
    catCount.get(chosen.id)![slot.category]++;
    totalAssigned.set(chosen.id, totalAssigned.get(chosen.id)! + 1);
    monthCount.get(chosen.id)!.set(info.monthKey, (monthCount.get(chosen.id)!.get(info.monthKey) ?? 0) + 1);
    assignedDates.get(chosen.id)!.add(info.epoch);
    lastGuard.set(chosen.id, Math.max(lastGuard.get(chosen.id) ?? -Infinity, info.epoch));
    if (info.weekendId != null) weekendIds.get(chosen.id)!.add(info.weekendId);
  }

  return { filled, remainingGaps };
}
