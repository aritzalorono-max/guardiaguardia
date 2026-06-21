import { describe, it, expect } from "vitest";
import {
  generateSchedule,
  fillOpenSlots,
  validateSchedule,
  DEFAULT_RULES,
  type EngineDoctor,
  type EngineInput,
  type EngineSlot,
  type EngineRules,
  type OpenAssignment,
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

describe("fillOpenSlots (rellenar huecos, Fase 8)", () => {
  const lab = (id: string, date: string, doctorId: string | null): OpenAssignment => ({
    id,
    date,
    category: "laborable",
    modality: "presencial",
    eligible: "cualquiera",
    doctorId,
  });

  it("rellena el hueco sin elegir al médico de baja y sin tocar lo ya asignado", () => {
    const doctors = [adj("a"), adj("b"), adj("c")];
    const assignments: OpenAssignment[] = [
      lab("s1", "2026-03-02", "a"),
      lab("s2", "2026-03-05", "b"),
      lab("s3", "2026-03-09", null), // hueco
    ];
    // 'a' está de baja el día del hueco.
    const blocked = new Map([["a", new Set(["2026-03-09"])]]);

    const result = fillOpenSlots({
      assignments,
      doctors,
      rules: { ...DEFAULT_RULES },
      blockedGuardDates: blocked,
    });

    expect(result.filled).toHaveLength(1);
    expect(result.filled[0].id).toBe("s3");
    expect(result.filled[0].doctorId).not.toBe("a"); // no el de baja
    expect(result.remainingGaps).toBe(0);
  });

  it("no hace nada si no quedan huecos", () => {
    const doctors = [adj("a"), adj("b")];
    const assignments: OpenAssignment[] = [
      lab("s1", "2026-03-02", "a"),
      lab("s2", "2026-03-05", "b"),
    ];
    const result = fillOpenSlots({
      assignments,
      doctors,
      rules: { ...DEFAULT_RULES },
      blockedGuardDates: new Map(),
    });
    expect(result.filled).toHaveLength(0);
    expect(result.remainingGaps).toBe(0);
  });

  it("deja hueco si no hay nadie disponible para cubrirlo", () => {
    const doctors = [adj("a")];
    const assignments: OpenAssignment[] = [
      lab("s1", "2026-03-09", null),
    ];
    const blocked = new Map([["a", new Set(["2026-03-09"])]]);
    const result = fillOpenSlots({
      assignments,
      doctors,
      rules: { ...DEFAULT_RULES },
      blockedGuardDates: blocked,
    });
    expect(result.filled).toHaveLength(0);
    expect(result.remainingGaps).toBe(1);
  });
});

describe("optimización por intercambios (Fase C)", () => {
  it("iguala las guardias laborables (spread ≤ 1) en un trimestre sin romper reglas", () => {
    const doctors = [adj("a"), adj("b"), adj("c"), adj("d")];
    const slots: EngineSlot[] = [
      { category: "laborable", modality: "localizada", eligible: "cualquiera", weight: 1 },
    ];
    const result = generateSchedule(baseInput({ doctors, slots, months: 3 }));

    const counts = doctors.map((d) => result.perDoctor[d.id].byCategory.laborable);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);

    for (const d of doctors) {
      const dates = result.assignments
        .filter((a) => a.doctorId === d.id)
        .map((a) => Date.parse(a.date))
        .sort((x, y) => x - y);
      for (let i = 1; i < dates.length; i++)
        expect((dates[i] - dates[i - 1]) / 86_400_000).toBeGreaterThanOrEqual(2);
    }
  });

  it("iguala los festivos (spread ≤ 1) cuando la regla de findes lo permite", () => {
    const doctors = [adj("a"), adj("b"), adj("c"), adj("d")];
    const slots: EngineSlot[] = [
      { category: "festivo", modality: "localizada", eligible: "cualquiera", weight: 2 },
    ];
    const result = generateSchedule(
      baseInput({
        doctors,
        slots,
        months: 3,
        rules: { ...DEFAULT_RULES, noTwoWeekends: false },
      }),
    );
    const counts = doctors.map((d) => result.perDoctor[d.id].byCategory.festivo);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });
});

describe("validateSchedule (doble check)", () => {
  const A = (date: string, doctorId: string | null, over: Partial<OpenAssignment> = {}): OpenAssignment => ({
    id: date + (doctorId ?? "x"),
    date,
    category: "laborable",
    modality: "presencial",
    eligible: "cualquiera",
    doctorId,
    ...over,
  });

  it("un reparto correcto no tiene errores", () => {
    const doctors = [adj("a"), adj("b")];
    const assignments = [A("2026-03-02", "a"), A("2026-03-05", "b")];
    const res = validateSchedule({
      assignments,
      doctors,
      rules: { ...DEFAULT_RULES },
      blockedGuardDates: new Map(),
    });
    expect(res.ok).toBe(true);
    expect(res.errorCount).toBe(0);
  });

  it("detecta huecos sin personal", () => {
    const doctors = [adj("a")];
    const res = validateSchedule({
      assignments: [A("2026-03-02", null)],
      doctors,
      rules: { ...DEFAULT_RULES },
      blockedGuardDates: new Map(),
    });
    expect(res.ok).toBe(false);
    expect(res.issues.some((i) => i.code === "hueco")).toBe(true);
  });

  it("detecta guardias sin descanso (consecutivas)", () => {
    const doctors = [adj("a")];
    const res = validateSchedule({
      assignments: [A("2026-03-02", "a"), A("2026-03-03", "a")],
      doctors,
      rules: { ...DEFAULT_RULES },
      blockedGuardDates: new Map(),
    });
    expect(res.issues.some((i) => i.code === "descanso")).toBe(true);
  });

  it("detecta médico asignado en día no disponible", () => {
    const doctors = [adj("a")];
    const res = validateSchedule({
      assignments: [A("2026-03-02", "a")],
      doctors,
      rules: { ...DEFAULT_RULES },
      blockedGuardDates: new Map([["a", new Set(["2026-03-02"])]]),
    });
    expect(res.issues.some((i) => i.code === "no_disponible")).toBe(true);
  });

  it("detecta elegibilidad incorrecta", () => {
    const doctors = [adj("a")];
    const res = validateSchedule({
      assignments: [A("2026-03-02", "a", { eligible: "residente" })],
      doctors,
      rules: { ...DEFAULT_RULES },
      blockedGuardDates: new Map(),
    });
    expect(res.issues.some((i) => i.code === "elegibilidad")).toBe(true);
  });
});
