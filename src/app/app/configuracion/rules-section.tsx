"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { RULE_GROUPS, ALL_RULES } from "@/lib/rules";
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
    await supabase.from("service_rules").upsert(
      {
        service_id: serviceId,
        rule_key: key,
        enabled: next.enabled,
        value: next.value,
      },
      { onConflict: "service_id,rule_key" },
    );
  }

  return (
    <div className="space-y-6">
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
              return (
                <div key={rule.key}>
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
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
