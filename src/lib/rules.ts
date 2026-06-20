/**
 * Catálogo de reglas del reparto de guardias. El estado (activada/valor) de
 * cada regla por servicio se guarda en la tabla `service_rules`; aquí vive la
 * definición (texto, si lleva parámetro, valores por defecto).
 */

export type RuleDef = {
  key: string;
  label: string;
  description?: string;
  hasValue?: boolean;
  valueLabel?: string;
  defaultValue?: number;
  defaultEnabled?: boolean;
};

export type RuleGroup = {
  id: string;
  title: string;
  description: string;
  rules: RuleDef[];
};

export const RULE_GROUPS: RuleGroup[] = [
  {
    id: "legal",
    title: "Legales",
    description:
      "Límites de jornada y descanso. Conviene mantenerlas activadas: son obligatorias en la mayoría de convenios.",
    rules: [
      {
        key: "rest_12h",
        label: "Descanso de 12 h tras la guardia",
        description: "No se asigna nada que rompa el descanso posterior.",
        defaultEnabled: true,
      },
      {
        key: "free_day_after",
        label: "Libra el día siguiente (saliente)",
        description: "Quien hace guardia no trabaja el día después.",
        defaultEnabled: true,
      },
      {
        key: "no_consecutive",
        label: "No dos guardias seguidas",
        description: "Nunca guardia ayer, hoy o mañana de forma encadenada.",
        defaultEnabled: true,
      },
      {
        key: "max_48h_week",
        label: "Máximo 48 h semanales",
        description: "Tope de horas de trabajo más guardia por semana.",
      },
      {
        key: "no_two_weekends",
        label: "No dos fines de semana seguidos",
        description: "Evita encadenar guardias de fin de semana.",
        defaultEnabled: true,
      },
      {
        key: "min_days_between",
        label: "Días mínimos entre guardias",
        description: "Separación mínima entre dos guardias de la misma persona.",
        hasValue: true,
        valueLabel: "días",
        defaultValue: 3,
      },
    ],
  },
  {
    id: "internal",
    title: "Internas",
    description: "Cómo reparte vuestro servicio en concreto.",
    rules: [
      {
        key: "presencial_only_residents",
        label: "Las presenciales solo las hacen residentes",
      },
      {
        key: "localizada_only_adjuntos",
        label: "Las localizadas solo las hacen adjuntos",
      },
      {
        key: "r1_with_tutor",
        label: "Los R1 hacen guardia acompañados de un tutor",
      },
      {
        key: "parttime_no_penalty",
        label: "La jornada parcial no penaliza en el reparto",
        defaultEnabled: true,
      },
      {
        key: "fair_holidays",
        label: "Reparto equitativo de festivos y vísperas",
        description:
          "Iguala el número de festivos y vísperas entre todos, no solo el total.",
        defaultEnabled: true,
      },
      {
        key: "localizada_without_resident_counts",
        label: "La localizada sin residente cuenta distinto",
        description:
          "Si un adjunto hace localizada sin residente de presencial, esa guardia pesa más.",
      },
      {
        key: "reinforce_if_no_resident",
        label: "Refuerzo si falta residente para una presencial",
        description: "Añade un adjunto extra cuando no hay residente disponible.",
      },
    ],
  },
  {
    id: "caps",
    title: "Topes",
    description: "Número máximo de guardias al mes.",
    rules: [
      {
        key: "max_per_month_resident",
        label: "Tope de guardias al mes (residentes)",
        hasValue: true,
        valueLabel: "guardias",
        defaultValue: 5,
      },
      {
        key: "max_per_month_adjunto",
        label: "Tope de guardias al mes (adjuntos)",
        hasValue: true,
        valueLabel: "guardias",
        defaultValue: 5,
      },
    ],
  },
  {
    id: "history",
    title: "Histórico",
    description: "Memoria entre periodos.",
    rules: [
      {
        key: "consider_history",
        label: "Tener en cuenta periodos anteriores",
        description:
          "Quien hizo de más en el ciclo previo, ahora hace de menos (deuda/crédito).",
        defaultEnabled: true,
      },
      {
        key: "reset_yearly",
        label: "Reiniciar contadores cada año",
        description: "Los contadores vuelven a cero al empezar el año.",
      },
    ],
  },
];

export const ALL_RULES: RuleDef[] = RULE_GROUPS.flatMap((g) => g.rules);

import type { EngineRules } from "@/lib/engine/schedule";

/** Convierte las filas de service_rules (+ valores por defecto) en EngineRules. */
export function resolveEngineRules(
  rows: { rule_key: string; enabled: boolean; value: number | null }[],
): EngineRules {
  const stored = new Map(rows.map((r) => [r.rule_key, r]));
  const def = new Map(ALL_RULES.map((r) => [r.key, r]));
  const on = (key: string) =>
    stored.has(key) ? stored.get(key)!.enabled : (def.get(key)?.defaultEnabled ?? false);
  const val = (key: string) => {
    const r = stored.get(key);
    return (r ? r.value : null) ?? def.get(key)?.defaultValue ?? null;
  };
  return {
    noConsecutive: on("no_consecutive"),
    freeDayAfter: on("free_day_after"),
    rest12h: on("rest_12h"),
    noTwoWeekends: on("no_two_weekends"),
    minDaysBetween: on("min_days_between") ? val("min_days_between") : null,
    maxPerMonthResident: on("max_per_month_resident") ? val("max_per_month_resident") : null,
    maxPerMonthAdjunto: on("max_per_month_adjunto") ? val("max_per_month_adjunto") : null,
    presencialOnlyResidents: on("presencial_only_residents"),
    localizadaOnlyAdjuntos: on("localizada_only_adjuntos"),
    partTimeNoPenalty: on("parttime_no_penalty"),
    considerHistory: on("consider_history"),
  };
}
