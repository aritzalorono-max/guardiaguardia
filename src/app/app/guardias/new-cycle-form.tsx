"use client";

import { useState } from "react";
import { generateCycle } from "./actions";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function NewCycleForm({
  ready,
  existing,
}: {
  ready: boolean;
  existing: { y: number; m: number }[];
}) {
  const now = new Date();
  const [startMonth, setStartMonth] = useState(now.getMonth());
  const [startYear, setStartYear] = useState(now.getFullYear());

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const dup = existing.some((x) => x.y === startYear && x.m === startMonth);
    if (
      dup &&
      !confirm(
        "Ya existe un reparto que empieza en ese mes. ¿Quieres generar otro de todas formas?",
      )
    ) {
      e.preventDefault();
    }
  }

  return (
    <form
      action={generateCycle}
      onSubmit={onSubmit}
      className="mt-6 rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2 className="font-semibold text-slate-900">Nuevo reparto</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Mes de inicio
          </span>
          <select
            name="startMonth"
            value={startMonth}
            onChange={(e) => setStartMonth(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Año</span>
          <input
            type="number"
            name="startYear"
            value={startYear}
            onChange={(e) => setStartYear(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Duración
          </span>
          <select
            name="months"
            defaultValue={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value={1}>1 mes</option>
            <option value={2}>2 meses</option>
            <option value={3}>3 meses (trimestre)</option>
            <option value={4}>4 meses</option>
            <option value={6}>6 meses</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Nombre (opcional)
          </span>
          <input
            type="text"
            name="name"
            placeholder="Ej. 1er trimestre"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={!ready}
        className="mt-4 rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        Generar reparto
      </button>
    </form>
  );
}
