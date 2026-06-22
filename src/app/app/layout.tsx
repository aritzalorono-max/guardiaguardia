import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "./app-nav";
import { Toaster } from "@/components/ui/toast";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: services } = await supabase
    .from("services")
    .select("hospital_name, specialty")
    .limit(1);
  const service = services?.[0];

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="flex items-center gap-2 font-semibold text-slate-900"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-600 text-white">
                G
              </span>
              GuardiaGuardia
            </Link>
            {service && (
              <div className="flex flex-col border-l border-slate-200 pl-3 leading-tight">
                <span className="text-sm font-semibold text-slate-900">
                  {service.hospital_name}
                </span>
                <span className="text-xs text-slate-500">
                  {service.specialty}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/app/cuenta"
              className="hidden text-slate-500 hover:text-teal-700 hover:underline sm:inline"
            >
              {user.email}
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
        <AppNav />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
