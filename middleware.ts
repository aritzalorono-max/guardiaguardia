import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Solo refrescamos la sesión y protegemos las rutas privadas. Las páginas
  // públicas (landing, login…) no pagan el coste de validar sesión.
  matcher: ["/app/:path*", "/onboarding/:path*"],
};
