"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { Field, Toggle, Alert } from "@/components/ui/form";

type DayType = Tables<"day_types">;

export function DayTypesSection({
  serviceId,
  initialDayTypes,
}: {
  serviceId: string;
  initialDayTypes: DayType[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [types, setTypes] = useState<DayType[]>(initialDayTypes);
  const [error, setError] = useState<string | null>(null);

  // Alta
  const [name, setName] = useState("");
  const [color, setColor] = useState("#0ea5e9");
  const [worked, setWorked] = useState(false);
  const [guard, setGuard] = useState(false);
  const [sub, setSub] = useState(false);

  async function patchType(id: string, patch: Partial<DayType>) {
    setTypes((t) => t.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    await supabase.from("day_types").update(patch).eq("id", id);
  }

  async function addType(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Indica un nombre para el tipo de día.");
      return;
    }
    const { data } = await supabase
      .from("day_types")
      .insert({
        service_id: serviceId,
        name: name.trim(),
        color,
        counts_as_worked: worked,
        allows_guard: guard,
        needs_substitute: sub,
        is_system: false,
      })
      .select("*")
      .single();
    if (data) {
      setTypes((t) => [...t, data]);
      setName("");
      setColor("#0ea5e9");
      setWorked(false);
      setGuard(false);
      setSub(false);
    }
  }

  async function removeType(t: DayType) {
    if (!confirm(`¿Eliminar el tipo "${t.name}"?`)) return;
    const { error } = await supabase.from("day_types").delete().eq("id", t.id);
    if (error) {
      alert(
        "No se puede eliminar: hay ausencias marcadas con este tipo. Cámbialas primero en el calendario.",
      );
      return;
    }
    setTypes((arr) => arr.filter((x) => x.id !== t.id));
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Cada tipo define si el día <strong>cuenta como trabajado</strong> (para el
        reparto proporcional), si <strong>permite hacer guardia</strong> y si{" "}
        <strong>necesita sustituto</strong> (como una baja: se le asigna la
        guardia pero la cubre otra persona). Puedes editar o eliminar cualquier
        tipo, incluidos los que vienen de serie.
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Color</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">¿Trabaja?</th>
              <th className="px-4 py-3 font-medium">¿Guardia?</th>
              <th className="px-4 py-3 font-medium">¿Sustituto?</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {types.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3">
                  <input
                    type="color"
                    defaultValue={t.color}
                    onBlur={(e) => patchType(t.id, { color: e.target.value })}
                    className="h-8 w-10 cursor-pointer rounded border border-slate-200"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      defaultValue={t.name}
                      onBlur={(e) =>
                        e.target.value.trim() &&
                        patchType(t.id, { name: e.target.value.trim() })
                      }
                      className="rounded-md border border-slate-300 px-2 py-1"
                    />
                    {t.is_system && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                        base
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Switch
                    checked={t.counts_as_worked}
                    onChange={(v) => patchType(t.id, { counts_as_worked: v })}
                  />
                </td>
                <td className="px-4 py-3">
                  <Switch
                    checked={t.allows_guard}
                    onChange={(v) =>
                      patchType(
                        t.id,
                        v ? { allows_guard: true } : { allows_guard: false, needs_substitute: false },
                      )
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <Switch
                    checked={t.needs_substitute}
                    disabled={!t.allows_guard}
                    onChange={(v) => patchType(t.id, { needs_substitute: v })}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => removeType(t)}
                    className="rounded-md px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Alta de tipo personalizado */}
      <form
        onSubmit={addType}
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <h3 className="font-semibold text-slate-900">Añadir tipo de día</h3>
        {error && (
          <div className="mt-3">
            <Alert>{error}</Alert>
          </div>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Asuntos propios"
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Color
            </span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-slate-300"
            />
          </label>
          <Toggle
            label="Cuenta como día trabajado"
            checked={worked}
            onChange={setWorked}
          />
          <Toggle
            label="Permite hacer guardia"
            checked={guard}
            onChange={(v) => {
              setGuard(v);
              if (!v) setSub(false);
            }}
          />
          <Toggle
            label="Necesita sustituto (tipo baja)"
            description="Se le asigna la guardia, pero la cubre otra persona."
            checked={sub}
            onChange={setSub}
          />
        </div>
        <button
          type="submit"
          className="mt-4 rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700"
        >
          Añadir tipo
        </button>
      </form>
    </div>
  );
}

function Switch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-teal-600" : "bg-slate-300"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
