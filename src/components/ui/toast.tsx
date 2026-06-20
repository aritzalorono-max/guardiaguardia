"use client";

import { useEffect, useState } from "react";

type ToastItem = { id: number; message: string; type: "error" | "success" };

let items: ToastItem[] = [];
let listeners: ((t: ToastItem[]) => void)[] = [];
let nextId = 1;

function emit() {
  for (const l of listeners) l(items);
}

function push(message: string, type: "error" | "success") {
  const item = { id: nextId++, message, type };
  items = [...items, item];
  emit();
  setTimeout(() => {
    items = items.filter((x) => x.id !== item.id);
    emit();
  }, 4000);
}

export const toast = {
  error: (message: string) => push(message, "error"),
  success: (message: string) => push(message, "success"),
};

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>(items);
  useEffect(() => {
    listeners.push(setList);
    return () => {
      listeners = listeners.filter((l) => l !== setList);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {list.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
            t.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
