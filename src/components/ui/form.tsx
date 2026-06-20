import {
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
} from "react";

export function Field({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
      />
    </label>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: { label: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <select
        {...props}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
      >
        {children}
      </select>
    </label>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-slate-300 px-3 py-2.5 text-left"
    >
      <span>
        <span className="block text-sm font-medium text-slate-700">
          {label}
        </span>
        {description && (
          <span className="block text-xs text-slate-500">{description}</span>
        )}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-teal-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function SubmitButton({
  children,
  loading,
}: {
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-lg bg-teal-600 px-4 py-2.5 font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
    >
      {loading ? "Un momento…" : children}
    </button>
  );
}

export function Alert({
  kind = "error",
  children,
}: {
  kind?: "error" | "success";
  children: React.ReactNode;
}) {
  const styles =
    kind === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>
      {children}
    </div>
  );
}
