"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import type { Tables } from "@/lib/database.types";
import { RULE_GROUPS, ALL_RULES, RULE_LABEL } from "@/lib/rules";
import { Toggle } from "@/components/ui/form";

type RuleRow = Tables<"service_rules">;
type State = Record<string, { enabled: boolean; value: number | null }>;

export function RulesSection({
  serviceId,
  initialRules,
}: {
  serviceId: string;
  initialRules: RuleRow[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [saved, setSaved] = useState(false);
  const [openInfo, setOpenInfo] = useState<Record<string, boolean>>({});

  const [state, setState] = useState<State>(() => {
    const stored = new Map(initialRules.map((r) => [r.rule_key, r]));
    const s: State = {};
    for (const def of ALL_RULES) {
      const row = stored.get(def.key);
      s[def.key] = row
        ? { enabled: row.enabled, value: row.value ?? def.defaultValue ?? null }
        : {
            enabled: def.defaultEnabled ?? false,
            value: def.defaultValue ?? null,
          };
    }
    return s;
  });

  async function persist(
    key: string,
    next: { enabled: boolean; value: number | null },
  ) {
    setState((s) => ({ ...s, [key]: next }));
    const { error } = await supabase.from("service_rules").upsert(
      {
        service_id: serviceId,
        rule_key: key,
        enabled: next.enabled,
        value: next.value,
      },
      { onConflict: "service_id,rule_key" },
    );
    if (error) {
      toast.error("No se pudo guardar la regla. Reintenta.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            saved ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
          }`}
        >
          {saved ? "Guardado ✓" : "Se guarda solo"}
        </span>
      </div>
      {RULE_GROUPS.map((group) => (
        <div
          key={group.id}
          className="rounded-xl border border-slate-200 bg-white p-5"
        >
          <h3 className="font-semibold text-slate-900">{group.title}</h3>
          <p className="text-xs text-slate-500">{group.description}</p>

          <div className="mt-4 space-y-3">
            {group.rules.map((rule) => {
              const st = state[rule.key];
              const open = openInfo[rule.key];
              return (
                <div key={rule.key} className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <Toggle
                    label={rule.label}
                    description={rule.description}
                    checked={st.enabled}
                    onChange={(v) => persist(rule.key, { ...st, enabled: v })}
                  />
                  {rule.hasValue && st.enabled && (
                    <div className="mt-1.5 flex items-center gap-2 pl-3 text-sm text-slate-600">
                      <span>{rule.valueLabel ?? "valor"}:</span>
                      <input
                        type="number"
                        min="0"
                        defaultValue={st.value ?? rule.defaultValue ?? 0}
                        onBlur={(e) =>
                          persist(rule.key, {
                            ...st,
                            value: Number(e.target.value) || 0,
                          })
                        }
                        className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                      />
                    </div>
                  )}

                  {(rule.details || rule.example) && (
                    <button
                      type="button"
                      onClick={() =>
                        setOpenInfo((o) => ({ ...o, [rule.key]: !o[rule.key] }))
                      }
                      className="mt-1 pl-3 text-xs font-medium text-teal-700 hover:underline"
                    >
                      {open ? "Ocultar información ▴" : "Más información ▾"}
                    </button>
                  )}

                  {open && (
                    <div className="mt-2 ml-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                      {rule.details && <p>{rule.details}</p>}
                      {rule.example && (
                        <p className="mt-2">
                          <span className="font-semibold text-slate-700">
                            Ejemplo:
                          </span>{" "}
                          <span className="italic">{rule.example}</span>
                        </p>
                      )}
                      {rule.related && rule.related.length > 0 && (
                        <p className="mt-2">
                          <span className="font-semibold text-slate-700">
                            Relacionada con:
                          </span>{" "}
                          {rule.related
                            .map((k) => RULE_LABEL[k] ?? k)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
