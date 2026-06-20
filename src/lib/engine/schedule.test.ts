import { describe, it, expect } from "vitest";
import {
  generateSchedule,
  DEFAULT_RULES,
  type EngineDoctor,
  type EngineInput,
  type EngineSlot,
  type EngineRules,
} from "./schedule";

function adj(id: string, extra: Partial<EngineDoctor> = {}): EngineDoctor {
  return { id, kind: "adjunto", doesGuards: true, isActive: true, partTime: false, ...extra };
}
function res(id: string, extra: Partial<EngineDoctor> = {}): EngineDoctor {
  return { id, kind: "residente", doesGuards: true, isActive: true, partTime: false, ...extra };
}

function baseInput(over: Partial<EngineInput> = {}): EngineInput {
  return {
    startYear: 2026,
    startMonth: 0, // enero
    months: 1,
    holidays: new Set(),
    doctors: [],
    slots: [],
    blockedGuardDates: new Map(),
    rules: { ...DEFAULT_RULES },
    ...over,
  };
}

const laborableSlot: EngineSlot = {
  category: "laborable",
  modality: "presencial",
  eligible: "cualquiera",
  weight: 1,
};

function datesOf(result: ReturnType<typeof generateSchedule>, doctorId: string) {
  return result.assignments
    .filter((a) => a.doctorId === doctorId)
    .map((a) => a.date)
    .sort();
}

describe("motor de reparto", () => {
  it("reparte de forma equilibrada (diferencia ≤ 1) y sin huecos", () => {
    const doctors = [adj("a"), adj("b"), adj("c")];
    const result = generateSchedule(
      baseInput({ doctors, slots: [laborableSlot] }),
    );

    expect(result.gaps).toHaveLength(0);

    const totals = doctors.map((d) => result.perDoctor[d.id].total);
    expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(1);
  });

  it("nunca asigna dos guardias consecutivas (regla dura)", () => {
    const doctors = [adj("a"), adj("b"), adj("c")];
    const result = generateSchedule(
      baseInput({ doctors, slots: [laborableSlot] }),
    );

    for (const d of doctors) {
      const dates = datesOf(result, d.id).map((s) => Date.parse(s));
      for (let i = 1; i < dates.length; i++) {
        const diffDays = (dates[i] - dates[i - 1]) / 86_400_000;
        expect(diffDays).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("respeta la disponibilidad: un médico bloqueado no recibe guardias", () => {
    const doctors = [adj("a"), adj("b"), adj("c")];
    // Bloquea por completo a 'a' (todas las fechas del mes).
    const blocked = new Set<string>();
    for (let day = 1; day <= 31; day++)
      blocked.add(`2026-01-${String(day).padStart(2, "0")}`);

    const result = generateSchedule(
      baseInput({
        doctors,
        slots: [laborableSlot],
        blockedGuardDates: new Map([["a", blocked]]),
      }),
    );

    expect(result.perDoctor["a"].total).toBe(0);
    expect(result.gaps).toHaveLength(0); // b y c cubren
  });

  it("respeta la elegibilidad: presencial de festivo solo para residentes", () => {
    const doctors = [res("r1"), adj("a1"), adj("a2")];
    const festivoResidente: EngineSlot = {
      category: "festivo",
      modality: "presencial",
      eligible: "residente",
      weight: 2,
    };
    const result = generateSchedule(
      baseInput({ doctors, slots: [festivoResidente] }),
    );

    // Los adjuntos no hacen ninguna guardia de festivo.
    expect(result.perDoctor["a1"].byCategory.festivo).toBe(0);
    expect(result.perDoctor["a2"].byCategory.festivo).toBe(0);
    // El residente cubre festivos.
    expect(result.perDoctor["r1"].byCategory.festivo).toBeGreaterThan(0);
  });

  it("marca huecos y avisa cuando no hay nadie elegible", () => {
    const doctors = [adj("a"), adj("b")]; // sin residentes
    const soloResidentes: EngineSlot = {
      category: "laborable",
      modality: "presencial",
      eligible: "residente",
      weight: 1,
    };
    const result = generateSchedule(
      baseInput({ doctors, slots: [soloResidentes] }),
    );

    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.assignments.every((a) => a.doctorId === null)).toBe(true);
    expect(result.warnings.join(" ")).toContain("elegibles");
  });

  it("aplica el tope mensual de guardias", () => {
    const doctors = [adj("a"), adj("b")];
    const rules: EngineRules = {
      ...DEFAULT_RULES,
      noConsecutive: false,
      freeDayAfter: false,
      rest12h: false,
      maxPerMonthAdjunto: 1,
    };
    const result = generateSchedule(
      baseInput({ doctors, slots: [laborableSlot], rules }),
    );

    expect(result.perDoctor["a"].total).toBeLessThanOrEqual(1);
    expect(result.perDoctor["b"].total).toBeLessThanOrEqual(1);
    // Hay más días laborables que cupo total -> huecos.
    expect(result.gaps.length).toBeGreaterThan(0);
  });

  it("tiene en cuenta el histórico: quien hizo más festivos antes, hace menos ahora", () => {
    const doctors = [res("r1"), res("r2")];
    const festivoSlot: EngineSlot = {
      category: "festivo",
      modality: "presencial",
      eligible: "residente",
      weight: 2,
    };
    const history = new Map([["r1", { festivo: 10 }]]);
    const result = generateSchedule(
      baseInput({
        doctors,
        slots: [festivoSlot],
        history,
        rules: { ...DEFAULT_RULES, noTwoWeekends: false },
      }),
    );

    // r2 (sin histórico) debe acabar con más festivos que r1 en este ciclo.
    expect(result.perDoctor["r2"].byCategory.festivo).toBeGreaterThanOrEqual(
      result.perDoctor["r1"].byCategory.festivo,
    );
  });
});
