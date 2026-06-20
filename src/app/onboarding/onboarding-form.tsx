"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Field,
  SelectField,
  Toggle,
  SubmitButton,
  Alert,
} from "@/components/ui/form";

const COMUNIDADES = [
  "Andalucía",
  "Aragón",
  "Principado de Asturias",
  "Illes Balears",
  "Canarias",
  "Cantabria",
  "Castilla y León",
  "Castilla-La Mancha",
  "Cataluña",
  "Comunitat Valenciana",
  "Extremadura",
  "Galicia",
  "Comunidad de Madrid",
  "Región de Murcia",
  "Comunidad Foral de Navarra",
  "País Vasco",
  "La Rioja",
  "Ceuta",
  "Melilla",
];

export function OnboardingForm() {
  const router = useRouter();
  const [hospital, setHospital] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [region, setRegion] = useState("");
  const [approxDoctors, setApproxDoctors] = useState("");
  const [hasResidents, setHasResidents] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("create_service", {
      p_hospital_name: hospital.trim(),
      p_specialty: specialty.trim(),
      p_region: region,
      p_approx_doctors: approxDoctors ? Number(approxDoctors) : 0,
      p_has_residents: hasResidents,
    });

    if (error) {
      setError("No hemos podido crear el servicio. Inténtalo de nuevo.");
      setLoading(false);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <span className="text-sm font-medium text-teal-700">Paso 1 de 1</span>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">
        Configura tu servicio
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Cuéntanos lo básico de tu servicio. Lo demás (cómo hacéis las guardias,
        médicos, calendario…) lo configurarás después con calma.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && <Alert>{error}</Alert>}

        <Field
          label="Nombre del hospital"
          required
          value={hospital}
          onChange={(e) => setHospital(e.target.value)}
          placeholder="Ej. Hospital Universitario de Cruces"
        />

        <Field
          label="Especialidad / servicio"
          required
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          placeholder="Ej. Cardiología"
        />

        <SelectField
          label="Comunidad autónoma"
          required
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          <option value="" disabled>
            Selecciona…
          </option>
          {COMUNIDADES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <p className="-mt-2 text-xs text-slate-500">
          Nos sirve para cargar los festivos de tu zona en el calendario.
        </p>

        <Field
          label="Número aproximado de médicos"
          type="number"
          min={1}
          value={approxDoctors}
          onChange={(e) => setApproxDoctors(e.target.value)}
          placeholder="Ej. 12"
        />

        <Toggle
          label="¿Tenéis residentes en el servicio?"
          description="Si no hay residentes, simplificaremos la configuración de guardias."
          checked={hasResidents}
          onChange={setHasResidents}
        />

        <SubmitButton loading={loading}>Crear servicio</SubmitButton>
      </form>
    </div>
  );
}
