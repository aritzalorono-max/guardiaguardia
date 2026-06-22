"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import type { Tables, Enums } from "@/lib/database.types";

type Slot = Tables<"guard_slots">;
type Category = Enums<"guard_day_category">;
type Modality = Enums<"guard_modality">;
type Eligibility = Enums<"slot_eligibility">;

const CATEGORIES: {
  id: Category;
  title: string;
  hint: string;
  defaultWeight: number;
}[] = [
  {
    id: "laborable",
    title: "Laborable",
    hint: "Lunes a jueves que no sean festivos.",
    defaultWeight: 1,
  },
  {
    id: "vispera",
    title: "Víspera de festivo",
    hint: "Viernes y días anteriores a un festivo.",
    defaultWeight: 1.5,
  },
  {
    id: "festivo",
    title: "Festivo",
    hint: "Festivos, sábados y domingos.",
    defaultWeight: 2,
  },
];

const MODALITIES: { id: Modality; label: string }[] = [
  { id: "presencial", label: "Presencial" },
  { id: "localizada", label: "Localizada" },
  { id: "telefonica", label: "Telefónica" },
];

export function SlotsSection({
  serviceId,
  hasResidents,
  initialSlots,
}: {
  serviceId: string;
  hasResidents: boolean;
  initialSlots: Slot[];
}) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [saved, setSaved] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const byCategory = (c: Category) =>
    slots
      .filter((s) => s.day_category === c)
      .sort((a, b) => a.position - b.position);

  function markSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  async function addSlot(category: Category, defaultWeight: number) {
    const position = byCategory(category).length;
    const { data, error } = await supabase
      .from("guard_slots")
      .insert({
        service_id: serviceId,
        day_category: category,
        modality: "presencial",
        eligible: "cualquiera",
        weight: defaultWeight,
        position,
      })
      .select("*")
      .single();
    if (error || !data) {
      toast.error("No se pudo guardar el puesto. Reintenta.");
      return;
    }
    setSlots((s) => [...s, data]);
    markSaved();
  }

  async function patchSlot(id: string, patch: Partial<Slot>) {
    setSlots((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("guard_slots").update(patch).eq("id", id);
    if (error) toast.error("No se pudo guardar el cambio. Reintenta.");
    else markSaved();
  }

  async function removeSlot(id: string) {
    setSlots((s) => s.filter((x) => x.id !== id));
    const { error } = await supabase.from("guard_slots").delete().eq("id", id);
    if (error) toast.error("No se pudo eliminar. Reintenta.");
    else markSaved();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-600">
          Indica qué puestos hay que cubrir cada día según su tipo. El número de
          personas por día es el número de puestos que añadas. El{" "}
          <strong>peso</strong> se usa para afinar la equidad (un festivo pesa
          más que un laborable); de base el reparto iguala el número de guardias
          de cada tipo.
        </p>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
            saved
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          {saved ? "Guardado ✓" : "Se guarda solo"}
        </span>
      </div>

      {CATEGORIES.map((cat) => {
        const items = byCategory(cat.id);
        return (
          <div
            key={cat.id}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{cat.title}</h3>
                <p className="text-xs text-slate-500">{cat.hint}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {items.length} {items.length === 1 ? "puesto" : "puestos"}/día
              </span>
            </div>

            {items.length > 0 && (
              <div className="mt-4 space-y-2">
                {items.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
                  >
                    <select
                      value={slot.modality}
                      onChange={(e) =>
                        patchSlot(slot.id, {
                          modality: e.target.value as Modality,
                        })
                      }
                      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    >
                      {MODALITIES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={slot.eligible}
                      onChange={(e) =>
                        patchSlot(slot.id, {
                          eligible: e.target.value as Eligibility,
                        })
                      }
                      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    >
                      <option value="cualquiera">Cualquiera</option>
                      <option value="adjunto">Solo adjuntos</option>
                      <option value="residente" disabled={!hasResidents}>
                        Solo residentes
                      </option>
                    </select>

                    <label className="flex items-center gap-1 text-sm text-slate-500">
                      Peso
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        defaultValue={slot.weight}
                        onBlur={(e) =>
                          patchSlot(slot.id, {
                            weight: Number(e.target.value) || 0,
                          })
                        }
                        className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                      />
                    </label>

                    <input
                      type="text"
                      placeholder="Etiqueta (opcional)"
                      defaultValue={slot.label ?? ""}
                      onBlur={(e) =>
                        patchSlot(slot.id, { label: e.target.value || null })
                      }
                      className="min-w-[120px] flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    />

                    <button
                      onClick={() => removeSlot(slot.id)}
                      className="rounded-md px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => addSlot(cat.id, cat.defaultWeight)}
              className="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              + Añadir puesto
            </button>
          </div>
        );
      })}
    </div>
  );
}
