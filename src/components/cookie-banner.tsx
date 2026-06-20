"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "gg-cookie-consent";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage solo en cliente
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);

  if (!show) return null;

  function accept() {
    localStorage.setItem(KEY, new Date().toISOString());
    setShow(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Usamos únicamente <strong>cookies técnicas necesarias</strong> para
          mantener tu sesión. No usamos cookies de publicidad ni de seguimiento.{" "}
          <Link href="/legal/cookies" className="font-medium text-teal-700 underline">
            Más información
          </Link>
          .
        </p>
        <button
          onClick={accept}
          className="shrink-0 rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
