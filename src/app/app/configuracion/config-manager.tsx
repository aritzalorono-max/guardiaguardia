"use client";

import { useState } from "react";
import type { Tables } from "@/lib/database.types";
import { SlotsSection } from "./slots-section";
import { RulesSection } from "./rules-section";
import { DayTypesSection } from "./day-types-section";

type Tab = "slots" | "rules" | "daytypes";

const TABS: { id: Tab; label: string }[] = [
  { id: "slots", label: "Puestos de guardia" },
  { id: "rules", label: "Reglas" },
  { id: "daytypes", label: "Tipos de día" },
];

export function ConfigManager({
  serviceId,
  hasResidents,
  initialSlots,
  initialRules,
  initialDayTypes,
}: {
  serviceId: string;
  hasResidents: boolean;
  initialSlots: Tables<"guard_slots">[];
  initialRules: Tables<"service_rules">[];
  initialDayTypes: Tables<"day_types">[];
}) {
  const [tab, setTab] = useState<Tab>("slots");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
      <p className="text-slate-500">
        Define cómo funcionan las guardias en tu servicio. Es la base del
        reparto automático.
      </p>

      <div className="mt-5 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "slots" && (
          <SlotsSection
            serviceId={serviceId}
            hasResidents={hasResidents}
            initialSlots={initialSlots}
          />
        )}
        {tab === "rules" && (
          <RulesSection serviceId={serviceId} initialRules={initialRules} />
        )}
        {tab === "daytypes" && (
          <DayTypesSection
            serviceId={serviceId}
            initialDayTypes={initialDayTypes}
          />
        )}
      </div>
    </div>
  );
}
