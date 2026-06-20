"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Link = { id: string; token: string; expires_at: string | null };

const EXPIRY_OPTIONS = [
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
  { label: "Sin caducidad", days: 0 },
];

export function ShareSection({
  cycleId,
  serviceId,
  initialLinks,
}: {
  cycleId: string;
  serviceId: string;
  initialLinks: Link[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const [days, setDays] = useState(30);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- origin solo existe en cliente
  useEffect(() => setOrigin(window.location.origin), []);

  const urlFor = (token: string) => `${origin}/compartir/${token}`;

  async function createLink() {
    setBusy(true);
    try {
      const expires_at =
        days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
      const { data } = await supabase
        .from("share_links")
        .insert({ service_id: serviceId, cycle_id: cycleId, expires_at })
        .select("id, token, expires_at")
        .single();
      if (data) setLinks((l) => [data, ...l]);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setLinks((l) => l.filter((x) => x.id !== id));
    await supabase.from("share_links").delete().eq("id", id);
  }

  async function copy(token: string) {
    await navigator.clipboard.writeText(urlFor(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-900">Compartir</h2>
      <p className="text-xs text-slate-500">
        Crea un enlace de solo lectura para enviar el cuadrante a los médicos.
        Puedes ponerle caducidad y revocarlo cuando quieras.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Caducidad</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.days} value={o.days}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={createLink}
          disabled={busy}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          Crear enlace
        </button>
      </div>

      {links.length > 0 && (
        <ul className="mt-4 space-y-2">
          {links.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2"
            >
              <input
                readOnly
                value={urlFor(l.token)}
                className="min-w-[200px] flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-600"
              />
              <button
                onClick={() => copy(l.token)}
                className="rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300"
              >
                {copied === l.token ? "¡Copiado!" : "Copiar"}
              </button>
              <span className="text-xs text-slate-400">
                {l.expires_at
                  ? `Caduca ${new Date(l.expires_at).toLocaleDateString("es-ES")}`
                  : "Sin caducidad"}
              </span>
              <button
                onClick={() => revoke(l.id)}
                className="rounded-md px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Revocar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
