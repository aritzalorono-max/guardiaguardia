import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-lg font-semibold text-slate-900"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-600 text-white">
          G
        </span>
        GuardiaGuardia
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
