"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import type { Tables, Enums } from "@/lib/database.types";
import { Field, SelectField, Toggle, SubmitButton, Alert } from "@/components/ui/form";

type Doctor = Tables<"doctors">;
type Kind = Enums<"doctor_kind">;
type Level = Enums<"resident_level">;

const LEVELS: Level[] = ["R1", "R2", "R3", "R4", "R5"];

type FormState = {
  first_name: string;
  last_name: string;
  kind: Kind;
  resident_level: Level | "";
  is_active: boolean;
  does_guards: boolean;
  part_time: boolean;
};

const EMPTY: FormState = {
  first_name: "",
  last_name: "",
  kind: "adjunto",
  resident_level: "",
  is_active: true,
  does_guards: true,
  part_time: false,
};

export function DoctorsManager({
  serviceId,
  hasResidents,
  initialDoctors,
}: {
  serviceId: string;
  hasResidents: boolean;
  initialDoctors: Doctor[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  }

  function openEdit(d: Doctor) {
    setEditingId(d.id);
    setForm({
      first_name: d.first_name,
      last_name: d.last_name,
      kind: d.kind,
      resident_level: d.resident_level ?? "",
      is_active: d.is_active,
      does_guards: d.does_guards,
      part_time: d.part_time,
    });
    setError(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("Indica el nombre y los apellidos.");
      return;
    }
    if (form.kind === "residente" && !form.resident_level) {
      setError("Indica el nivel de residente (R1–R5).");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const payload = {
      service_id: serviceId,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      kind: form.kind,
      resident_level: form.kind === "residente" ? (form.resident_level as Level) : null,
      is_active: form.is_active,
      does_guards: form.does_guards,
      part_time: form.part_time,
    };

    const { error } = editingId
      ? await supabase.from("doctors").update(payload).eq("id", editingId)
      : await supabase.from("doctors").insert(payload);

    if (error) {
      setError("No hemos podido guardar. Inténtalo de nuevo.");
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  async function remove(d: Doctor) {
    if (
      !confirm(
        `¿Eliminar a ${d.first_name} ${d.last_name}? Se borrarán también sus ausencias.`,
      )
    )
      return;
    const supabase = createClient();
    const { error } = await supabase.from("doctors").delete().eq("id", d.id);
    if (error) {
      toast.error("No se ha podido eliminar.");
      return;
    }
    router.refresh();
  }

  function typeLabel(d: Doctor) {
    return d.kind === "residente" ? d.resident_level ?? "Residente" : "Adjunto";
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Médicos</h1>
          <p className="text-slate-500">
            {initialDoctors.length}{" "}
            {initialDoctors.length === 1 ? "médico" : "médicos"} en el servicio.
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700"
        >
          + Añadir médico
        </button>
      </div>

      {initialDoctors.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-600">
            Aún no has añadido ningún médico. Empieza por el primero.
          </p>
          <button
            onClick={openNew}
            className="mt-4 rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700"
          >
            + Añadir médico
          </button>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Trabaja</th>
                <th className="px-4 py-3 font-medium">Guardias</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialDoctors.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {d.last_name}, {d.first_name}
                    {d.part_time && (
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                        parcial
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        d.kind === "residente"
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {typeLabel(d)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Dot ok={d.is_active} yes="Sí" no="No" />
                  </td>
                  <td className="px-4 py-3">
                    <Dot ok={d.does_guards} yes="Sí" no="No" />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(d)}
                      className="rounded-md px-2 py-1 text-sm font-medium text-teal-700 hover:bg-teal-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => remove(d)}
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
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              {editingId ? "Editar médico" : "Añadir médico"}
            </h2>
            <form onSubmit={save} className="mt-4 space-y-4">
              {error && <Alert>{error}</Alert>}
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Nombre"
                  required
                  value={form.first_name}
                  onChange={(e) =>
                    setForm({ ...form, first_name: e.target.value })
                  }
                />
                <Field
                  label="Apellidos"
                  required
                  value={form.last_name}
                  onChange={(e) =>
                    setForm({ ...form, last_name: e.target.value })
                  }
                />
              </div>

              <SelectField
                label="Tipo"
                value={form.kind}
                onChange={(e) =>
                  setForm({
                    ...form,
                    kind: e.target.value as Kind,
                    resident_level:
                      e.target.value === "adjunto" ? "" : form.resident_level,
                  })
                }
              >
                <option value="adjunto">Adjunto</option>
                <option value="residente" disabled={!hasResidents}>
                  Residente{!hasResidents ? " (servicio sin residentes)" : ""}
                </option>
              </SelectField>

              {form.kind === "residente" && (
                <SelectField
                  label="Nivel de residente"
                  value={form.resident_level}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      resident_level: e.target.value as Level,
                    })
                  }
                >
                  <option value="" disabled>
                    Selecciona…
                  </option>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </SelectField>
              )}

              <div className="space-y-2">
                <Toggle
                  label="Está trabajando"
                  description="Si está de baja larga o no incorporado, desactívalo."
                  checked={form.is_active}
                  onChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Toggle
                  label="Hace guardias"
                  checked={form.does_guards}
                  onChange={(v) => setForm({ ...form, does_guards: v })}
                />
                <Toggle
                  label="Jornada parcial"
                  checked={form.part_time}
                  onChange={(v) => setForm({ ...form, part_time: v })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <div className="flex-1">
                  <SubmitButton loading={loading}>
                    {editingId ? "Guardar" : "Añadir"}
                  </SubmitButton>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Dot({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-slate-300"}`}
      />
      <span className={ok ? "text-slate-700" : "text-slate-400"}>
        {ok ? yes : no}
      </span>
    </span>
  );
}
