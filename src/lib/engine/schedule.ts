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
// ============================================================

export interface OpenAssignment {
  id: string;
  date: string;
  category: DayCategory;
  modality: Modality;
  eligible: Eligibility;
  doctorId: string | null;
  /** Quien hace realmente la guardia si el titular está de baja. */
  substituteId?: string | null;
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

// ============================================================
// Verificación (doble check) de un reparto ya existente.
// Detecta huecos, incumplimientos de reglas, médicos no disponibles,
// elegibilidad incorrecta y desequilibrios.
// ============================================================

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  date?: string;
  doctorId?: string;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  ok: boolean;
}

const MODALITY_ES: Record<Modality, string> = {
  presencial: "presencial",
  localizada: "localizada",
  telefonica: "telefónica",
};

export function validateSchedule(params: {
  assignments: OpenAssignment[];
  doctors: EngineDoctor[];
  rules: EngineRules;
  blockedGuardDates: Map<string, Set<string>>;
  /** doctorId -> fechas de baja (asignable pero necesita sustituto). */
  substituteNeeded?: Map<string, Set<string>>;
}): ValidationResult {
  const { rules } = params;
  const substituteNeeded = params.substituteNeeded ?? new Map<string, Set<string>>();
  const issues: ValidationIssue[] = [];
  const docById = new Map(params.doctors.map((d) => [d.id, d]));

  const baseGap = rules.noConsecutive || rules.freeDayAfter || rules.rest12h ? 2 : 1;
  const gapDiff = Math.max(baseGap, rules.minDaysBetween ?? 1);

  // 1) Cobertura: huecos sin personal.
  for (const a of params.assignments) {
    if (!a.doctorId) {
      issues.push({
        severity: "error",
        code: "hueco",
        message: `${a.date}: puesto ${MODALITY_ES[a.modality]} sin personal de guardia.`,
        date: a.date,
      });
    }
  }

  // 2) Por asignación cubierta: elegibilidad, disponibilidad, médico válido.
  for (const a of params.assignments) {
    if (!a.doctorId) continue;
    const doc = docById.get(a.doctorId);
    if (!doc) continue;

    if (!doc.doesGuards || !doc.isActive) {
      issues.push({
        severity: "error",
        code: "medico_invalido",
        message: `${a.date}: asignado a un médico que no está activo o no hace guardias.`,
        date: a.date,
        doctorId: a.doctorId,
      });
    }
    if (!canCover(doc, a.modality, a.eligible, rules)) {
      issues.push({
        severity: "error",
        code: "elegibilidad",
        message: `${a.date}: el médico no cumple la elegibilidad del puesto (${MODALITY_ES[a.modality]}${
          a.eligible !== "cualquiera" ? `, solo ${a.eligible}s` : ""
        }).`,
        date: a.date,
        doctorId: a.doctorId,
      });
    }
    if (params.blockedGuardDates.get(a.doctorId)?.has(a.date)) {
      issues.push({
        severity: "error",
        code: "no_disponible",
        message: `${a.date}: el médico está de ausencia/baja y no puede hacer guardia ese día.`,
        date: a.date,
        doctorId: a.doctorId,
      });
    }
  }

  // 2b) Sustitutos: si el titular está de baja, debe haber un sustituto válido.
  for (const a of params.assignments) {
    if (!a.doctorId) continue;
    if (!substituteNeeded.get(a.doctorId)?.has(a.date)) continue;
    const sub = a.substituteId ?? null;
    if (!sub) {
      issues.push({
        severity: "error",
        code: "sin_sustituto",
        message: `${a.date}: el titular está de baja y no tiene sustituto que cubra la guardia.`,
        date: a.date,
        doctorId: a.doctorId,
      });
      continue;
    }
    if (substituteNeeded.get(sub)?.has(a.date) || params.blockedGuardDates.get(sub)?.has(a.date)) {
      issues.push({
        severity: "error",
        code: "sustituto_no_disponible",
        message: `${a.date}: el sustituto asignado tampoco está disponible ese día.`,
        date: a.date,
        doctorId: sub,
      });
    }
  }

  // 3) Por médico: descanso, dos findes seguidos, tope mensual.
  const perDoctor = new Map<string, OpenAssignment[]>();
  for (const a of params.assignments) {
    if (!a.doctorId) continue;
    (perDoctor.get(a.doctorId) ?? perDoctor.set(a.doctorId, []).get(a.doctorId)!).push(a);
  }

  for (const [docId, list] of perDoctor) {
    const doc = docById.get(docId);
    const infos = list
      .map((a) => ({ ...infoFromDate(a.date), date: a.date }))
      .sort((x, y) => x.epoch - y.epoch);

    // Descanso / separación mínima (vecinos en orden).
    for (let i = 1; i < infos.length; i++) {
      const diff = infos[i].epoch - infos[i - 1].epoch;
      if (diff < gapDiff) {
        issues.push({
          severity: "error",
          code: "descanso",
          message: `${infos[i].date}: guardia demasiado cerca de la del ${infos[i - 1].date} (no se respeta el descanso).`,
          date: infos[i].date,
          doctorId: docId,
        });
      }
    }

    // No dos fines de semana seguidos.
    if (rules.noTwoWeekends) {
      const weekendIds = infos
        .map((x) => x.weekendId)
        .filter((w): w is number => w != null)
        .sort((a, b) => a - b);
      for (let i = 1; i < weekendIds.length; i++) {
        if (weekendIds[i] - weekendIds[i - 1] === 7) {
          issues.push({
            severity: "error",
            code: "findes",
            message: `${docId ? "" : ""}Dos fines de semana de guardia seguidos.`,
            doctorId: docId,
          });
          break;
        }
      }
    }

    // Tope mensual.
    const cap = doc?.kind === "residente" ? rules.maxPerMonthResident : rules.maxPerMonthAdjunto;
    if (cap != null) {
      const perMonth = new Map<string, number>();
      for (const x of infos) perMonth.set(x.monthKey, (perMonth.get(x.monthKey) ?? 0) + 1);
      for (const [month, n] of perMonth) {
        if (n > cap) {
          issues.push({
            severity: "error",
            code: "tope",
            message: `Supera el tope mensual en ${month}: ${n} guardias (máximo ${cap}).`,
            doctorId: docId,
          });
        }
      }
    }
  }

  // 4) Equidad (aviso): diferencia > 1 por categoría entre quienes hacen guardias.
  const eligibleIds = params.doctors.filter((d) => d.doesGuards && d.isActive).map((d) => d.id);
  for (const cat of ["laborable", "vispera", "festivo"] as DayCategory[]) {
    const counts = eligibleIds.map(
      (id) => params.assignments.filter((a) => a.doctorId === id && a.category === cat).length,
    );
    if (counts.length > 1) {
      const spread = Math.max(...counts) - Math.min(...counts);
      if (spread > 1) {
        issues.push({
          severity: "warning",
          code: "equidad",
          message: `Reparto poco equilibrado en ${cat}: diferencia de ${spread} guardias entre médicos.`,
        });
      }
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.length - errorCount;
  return { issues, errorCount, warningCount, ok: errorCount === 0 };
}

// ============================================================
// Autocorrección: libera las guardias problemáticas y las vuelve a
// asignar respetando todas las reglas. Devuelve los cambios a aplicar.
// ============================================================

export interface AutoFixResult {
  changes: { id: string; doctorId: string | null }[];
  releasedCount: number;
  refilledCount: number;
  remainingErrors: number;
}

export function autoFixSchedule(params: {
  assignments: OpenAssignment[];
  doctors: EngineDoctor[];
  rules: EngineRules;
  blockedGuardDates: Map<string, Set<string>>;
  history?: Map<string, Partial<Record<DayCategory, number>>>;
}): AutoFixResult {
  const { rules } = params;
  const docById = new Map(params.doctors.map((d) => [d.id, d]));
  const baseGap = rules.noConsecutive || rules.freeDayAfter || rules.rest12h ? 2 : 1;
  const gapDiff = Math.max(baseGap, rules.minDaysBetween ?? 1);

  const work: OpenAssignment[] = params.assignments.map((a) => ({ ...a }));
  const original = new Map(params.assignments.map((a) => [a.id, a.doctorId]));

  // a) Liberar asignaciones inválidas por sí mismas.
  for (const a of work) {
    if (!a.doctorId) continue;
    const doc = docById.get(a.doctorId);
    if (!doc || !doc.doesGuards || !doc.isActive) {
      a.doctorId = null;
      continue;
    }
    if (!canCover(doc, a.modality, a.eligible, rules)) {
      a.doctorId = null;
      continue;
    }
    if (params.blockedGuardDates.get(a.doctorId)?.has(a.date)) {
      a.doctorId = null;
    }
  }

  // b) Resolver conflictos por médico (descanso, findes, tope): se conserva la
  //    guardia más temprana y se liberan las que entran en conflicto.
  const byDoc = new Map<string, OpenAssignment[]>();
  for (const a of work) {
    if (!a.doctorId) continue;
    (byDoc.get(a.doctorId) ?? byDoc.set(a.doctorId, []).get(a.doctorId)!).push(a);
  }
  for (const [docId, list] of byDoc) {
    const doc = docById.get(docId)!;
    const sorted = list
      .map((a) => ({ a, ...infoFromDate(a.date) }))
      .sort((x, y) => x.epoch - y.epoch);

    // descanso / separación
    let lastKept = -Infinity;
    for (const it of sorted) {
      if (it.a.doctorId == null) continue;
      if (it.epoch - lastKept < gapDiff) it.a.doctorId = null;
      else lastKept = it.epoch;
    }
    // dos findes seguidos
    if (rules.noTwoWeekends) {
      let lastWk = -Infinity;
      for (const it of sorted) {
        if (it.a.doctorId == null || it.weekendId == null) continue;
        if (it.weekendId - lastWk === 7) it.a.doctorId = null;
        else lastWk = it.weekendId;
      }
    }
    // tope mensual
    const cap = doc.kind === "residente" ? rules.maxPerMonthResident : rules.maxPerMonthAdjunto;
    if (cap != null) {
      const perMonth = new Map<string, number>();
      for (const it of sorted) {
        if (it.a.doctorId == null) continue;
        const n = (perMonth.get(it.monthKey) ?? 0) + 1;
        if (n > cap) it.a.doctorId = null;
        else perMonth.set(it.monthKey, n);
      }
    }
  }

  // c) Rellenar de nuevo los huecos resultantes de forma válida.
  const fill = fillOpenSlots({
    assignments: work,
    doctors: params.doctors,
    rules,
    blockedGuardDates: params.blockedGuardDates,
    history: params.history,
  });
  for (const f of fill.filled) {
    const a = work.find((x) => x.id === f.id);
    if (a) a.doctorId = f.doctorId;
  }

  // d) Calcular cambios respecto al original.
  const changes: { id: string; doctorId: string | null }[] = [];
  let releasedCount = 0;
  let refilledCount = 0;
  for (const a of work) {
    const orig = original.get(a.id) ?? null;
    if (a.doctorId !== orig) {
      changes.push({ id: a.id, doctorId: a.doctorId });
      if (orig && !a.doctorId) releasedCount++;
      if (a.doctorId) refilledCount++;
    }
  }

  const remainingErrors = validateSchedule({
    assignments: work,
    doctors: params.doctors,
    rules,
    blockedGuardDates: params.blockedGuardDates,
  }).errorCount;

  return { changes, releasedCount, refilledCount, remainingErrors };
}

// ============================================================
// Sustitutos: para cada guardia cuyo titular está de baja ese día,
// elige a alguien que NO esté de baja (ni bloqueado) para que la haga.
// Si el primer candidato también estuviera de baja, simplemente no se
// elige (solo se consideran personas plenamente disponibles).
// ============================================================

export function assignSubstitutes(params: {
  assignments: OpenAssignment[];
  doctors: EngineDoctor[];
  rules: EngineRules;
  blockedGuardDates: Map<string, Set<string>>;
  /** doctorId -> fechas en las que está de baja (asignable pero no puede). */
  substituteNeeded: Map<string, Set<string>>;
}): { id: string; substituteId: string | null }[] {
  const candidates = params.doctors.filter((d) => d.doesGuards && d.isActive);
  const fullyAvailable = (id: string, date: string) =>
    !params.blockedGuardDates.get(id)?.has(date) &&
    !params.substituteNeeded.get(id)?.has(date);

  const titularCount = new Map<string, number>();
  for (const a of params.assignments)
    if (a.doctorId) titularCount.set(a.doctorId, (titularCount.get(a.doctorId) ?? 0) + 1);

  const dayUsage = new Map<string, Set<string>>();
  for (const a of params.assignments) {
    if (!a.doctorId) continue;
    (dayUsage.get(a.date) ?? dayUsage.set(a.date, new Set()).get(a.date)!).add(a.doctorId);
  }

  const subsCount = new Map<string, number>();
  const catPriority: Record<DayCategory, number> = { festivo: 0, vispera: 1, laborable: 2 };
  const needing = params.assignments
    .filter((a) => a.doctorId && params.substituteNeeded.get(a.doctorId)?.has(a.date))
    .sort((a, b) => catPriority[a.category] - catPriority[b.category] || (a.date < b.date ? -1 : 1));

  const result: { id: string; substituteId: string | null }[] = [];
  for (const a of needing) {
    const used = dayUsage.get(a.date) ?? new Set<string>();
    const pool = candidates.filter(
      (d) =>
        d.id !== a.doctorId &&
        fullyAvailable(d.id, a.date) &&
        canCover(d, a.modality, a.eligible, params.rules) &&
        !used.has(d.id),
    );
    if (pool.length === 0) {
      result.push({ id: a.id, substituteId: null });
      continue;
    }
    pool.sort((x, y) => {
      const sx = subsCount.get(x.id) ?? 0;
      const sy = subsCount.get(y.id) ?? 0;
      if (sx !== sy) return sx - sy;
      const tx = titularCount.get(x.id) ?? 0;
      const ty = titularCount.get(y.id) ?? 0;
      if (tx !== ty) return tx - ty;
      return x.id < y.id ? -1 : 1;
    });
    const chosen = pool[0];
    subsCount.set(chosen.id, (subsCount.get(chosen.id) ?? 0) + 1);
    (dayUsage.get(a.date) ?? dayUsage.set(a.date, new Set()).get(a.date)!).add(chosen.id);
    result.push({ id: a.id, substituteId: chosen.id });
  }
  return result;
}
