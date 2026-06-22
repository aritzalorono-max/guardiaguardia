/**
 * Catálogo de reglas del reparto de guardias. El estado (activada/valor) de
 * cada regla por servicio se guarda en la tabla `service_rules`; aquí vive la
 * definición (texto, si lleva parámetro, valores por defecto).
 */

export type RuleDef = {
  key: string;
  label: string;
  description?: string;
  /** Explicación detallada de qué hace y qué ocurre al activarla. */
  details?: string;
  /** Ejemplo concreto. */
  example?: string;
  /** Claves de otras reglas relacionadas. */
  related?: string[];
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
        details:
          "Al activarla, después de una guardia la persona tiene garantizadas 12 horas de descanso, así que el sistema no le pone otra guardia el día siguiente. En la práctica funciona igual que «no dos guardias seguidas». Si la desactivas, podría asignarse una guardia justo al día siguiente de otra.",
        example:
          "Si alguien hace guardia el martes, el miércoles no recibe otra guardia.",
        related: ["free_day_after", "no_consecutive", "min_days_between"],
        defaultEnabled: true,
      },
      {
        key: "free_day_after",
        label: "Libra el día siguiente (saliente)",
        description: "Quien hace guardia no trabaja el día después.",
        details:
          "El día después de una guardia es «saliente»: la persona libra y no se le asigna ninguna guardia ese día. Va de la mano del descanso de 12 h; tenerlas activas a la vez es lo habitual.",
        example: "Guardia el viernes → el sábado libra (no hace guardia).",
        related: ["rest_12h", "no_consecutive"],
        defaultEnabled: true,
      },
      {
        key: "no_consecutive",
        label: "No dos guardias seguidas",
        description: "Nunca guardia ayer, hoy o mañana de forma encadenada.",
        details:
          "Impide que la misma persona tenga guardia dos días consecutivos. Es la base del descanso. «Días mínimos entre guardias» es una versión más estricta de esta misma idea (exige aún más separación).",
        example:
          "Si tienes guardia el lunes, no puedes tener guardia el martes.",
        related: ["rest_12h", "free_day_after", "min_days_between"],
        defaultEnabled: true,
      },
      {
        key: "max_48h_week",
        label: "Máximo 48 h semanales",
        description: "Tope de horas de trabajo más guardia por semana.",
        details:
          "Limita el total de horas (jornada + guardias) por semana, según la directiva europea de tiempo de trabajo. Evita semanas con demasiada carga acumulada.",
        example:
          "Con jornada habitual, no se encadenan guardias que superen el límite semanal.",
      },
      {
        key: "no_two_weekends",
        label: "No dos fines de semana seguidos",
        description: "Evita encadenar guardias de fin de semana.",
        details:
          "Si una persona hace guardia un fin de semana, el fin de semana siguiente no se le asigna otra de fin de semana. Reparte mejor la carga de los findes a lo largo del tiempo.",
        example:
          "Guardia el sábado 7 → el fin de semana del 14 no le toca guardia de finde.",
        related: ["fair_holidays"],
        defaultEnabled: true,
      },
      {
        key: "min_days_between",
        label: "Días mínimos entre guardias",
        description: "Separación mínima entre dos guardias de la misma persona.",
        details:
          "Define cuántos días, como mínimo, deben pasar entre dos guardias de la misma persona. Es una versión más exigente que «no dos guardias seguidas»: si pones un valor mayor que 1, manda este. Cuanto más alto, más se reparten en el tiempo (pero más difícil de cuadrar si hay poca gente).",
        example:
          "Con valor 3: entre una guardia y la siguiente deben pasar al menos 3 días.",
        related: ["no_consecutive"],
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
        details:
          "Excluye a los adjuntos de las guardias presenciales: solo las cubren residentes. Suele combinarse con «las localizadas solo las hacen adjuntos» en servicios donde los residentes están presentes y los adjuntos quedan localizados. Si un día no hay ningún residente disponible, ese puesto queda como hueco (salvo que actives el refuerzo de adjunto).",
        example:
          "La guardia presencial del sábado solo puede asignarse a un residente.",
        related: [
          "localizada_only_adjuntos",
          "reinforce_if_no_resident",
          "localizada_without_resident_counts",
        ],
      },
      {
        key: "localizada_only_adjuntos",
        label: "Las localizadas solo las hacen adjuntos",
        details:
          "Las guardias localizadas solo las cubren adjuntos (los residentes quedan excluidos de ellas). Es el complemento habitual de «las presenciales solo las hacen residentes».",
        example: "La localizada del martes solo puede asignarse a un adjunto.",
        related: ["presencial_only_residents"],
      },
      {
        key: "r1_with_tutor",
        label: "Los R1 hacen guardia acompañados de un tutor",
        details:
          "Los residentes de primer año no hacen guardia solos: deben coincidir con un tutor (adjunto o residente mayor) el mismo día. Evita dejar a un R1 sin supervisión.",
        example:
          "Si un R1 tiene guardia el jueves, ese día también hay un tutor de guardia.",
      },
      {
        key: "parttime_no_penalty",
        label: "La jornada parcial no penaliza en el reparto",
        description: "Cuenta igual que jornada completa.",
        details:
          "Con esta regla, quien tiene jornada parcial hace el mismo número de guardias que el resto. Si la desactivas, la jornada parcial reduce de forma proporcional sus guardias (hace menos).",
        example:
          "Activada: un médico al 50 % hace tantas guardias como uno al 100 %. Desactivada: hace aproximadamente la mitad.",
        defaultEnabled: true,
      },
      {
        key: "fair_holidays",
        label: "Reparto equitativo de festivos y vísperas",
        description:
          "Iguala el número de festivos y vísperas entre todos, no solo el total.",
        details:
          "Hace que cada tipo de día (laborable, víspera y festivo) se reparta por separado de forma equilibrada. Sin esta regla, alguien podría acabar con casi todos los festivos aunque el total de guardias cuadre.",
        example:
          "Con 12 festivos y 4 médicos, cada uno hace 3 festivos, no que a uno le toquen 9.",
        related: ["no_two_weekends"],
        defaultEnabled: true,
      },
      {
        key: "localizada_without_resident_counts",
        label: "La localizada sin residente cuenta distinto",
        description:
          "Si un adjunto hace localizada sin residente de presencial, esa guardia pesa más.",
        details:
          "Una localizada que un adjunto cubre sin que haya un residente de presencial ese día es más dura (asume más responsabilidad). Al activarla, esa guardia «pesa» más, de modo que el reparto compensa a quien las hace. Solo tiene efecto si en algunos días hay localizada sin presencial.",
        example:
          "Una localizada en solitario cuenta como 1,5 a efectos de equilibrar, en vez de 1.",
        related: ["presencial_only_residents"],
      },
      {
        key: "reinforce_if_no_resident",
        label: "Refuerzo si falta residente para una presencial",
        description: "Añade un adjunto extra cuando no hay residente disponible.",
        details:
          "Si una guardia presencial es solo para residentes y no hay ninguno disponible ese día, en lugar de dejarla sin cubrir se asigna a un adjunto de refuerzo. Si la desactivas, ese puesto queda como hueco y decides tú a mano.",
        example:
          "No hay residentes libres el domingo → cubre la presencial un adjunto.",
        related: ["presencial_only_residents"],
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
        details:
          "Limita cuántas guardias puede hacer cada residente en un mismo mes. Útil cuando los residentes tienen un máximo por convenio. Ojo: si el tope es muy bajo y hay pocos residentes, pueden quedar días sin cubrir (huecos) que tendrás que resolver tú.",
        example:
          "Con valor 4: ningún residente hará más de 4 guardias en un mes.",
        related: ["max_per_month_adjunto", "reinforce_if_no_resident"],
        hasValue: true,
        valueLabel: "guardias",
        defaultValue: 5,
      },
      {
        key: "max_per_month_adjunto",
        label: "Tope de guardias al mes (adjuntos)",
        details:
          "Igual que el anterior, pero para los adjuntos: máximo de guardias al mes por adjunto.",
        example: "Con valor 5: ningún adjunto pasa de 5 guardias al mes.",
        related: ["max_per_month_resident"],
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
        details:
          "El reparto mira los ciclos ya guardados: si alguien hizo más guardias (o más festivos) de lo que le tocaba, en el nuevo reparto hace menos, y al revés. Así se compensa a lo largo del tiempo, no solo dentro de un trimestre.",
        example:
          "Si en el 1er trimestre alguien hizo 2 festivos de más, en el 2º hará 2 menos.",
        related: ["reset_yearly"],
        defaultEnabled: true,
      },
      {
        key: "reset_yearly",
        label: "Reiniciar contadores cada año",
        description: "Los contadores vuelven a cero al empezar el año.",
        details:
          "Al empezar un año nuevo, la deuda/crédito acumulada vuelve a cero, de modo que el histórico solo cuenta dentro del mismo año. Tiene sentido junto a «tener en cuenta periodos anteriores».",
        example:
          "El cómputo de festivos de más/menos se reinicia cada 1 de enero.",
        related: ["consider_history"],
      },
    ],
  },
];

export const ALL_RULES: RuleDef[] = RULE_GROUPS.flatMap((g) => g.rules);

/** Etiqueta legible de cada regla por su clave (para mostrar relaciones). */
export const RULE_LABEL: Record<string, string> = Object.fromEntries(
  ALL_RULES.map((r) => [r.key, r.label]),
);

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
