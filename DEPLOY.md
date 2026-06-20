# Cómo desplegar GuardiaGuardia (guía sin tecnicismos)

## Paso 1 — Conectar el repositorio a Vercel
1. Entra en **https://vercel.com** e inicia sesión con tu cuenta de **GitHub**.
2. Pulsa **Add New… → Project**.
3. En la lista de repositorios, busca **`aritzalorono-max/guardiaguardia`** y pulsa **Import**.
4. Vercel detectará solo que es un proyecto **Next.js** (no cambies nada de la configuración de build).

## Paso 2 — Añadir las variables de entorno (importante)
Antes de pulsar Deploy, abre la sección **Environment Variables** y añade estas dos
(son claves *públicas*, seguras para el navegador y protegidas por RLS):

| Nombre | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://culgsaotgccoqifgxoky.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_OVGoTu15bPJ0ij0w6XrEFw_3TN5wRxL` |

## Paso 3 — Desplegar
1. Pulsa **Deploy** y espera ~2 minutos.
2. Vercel te dará una URL del tipo `https://guardiaguardia-xxxx.vercel.app`.
3. **Cópiame esa URL.** A partir de aquí, cada cambio que subamos se publicará solo.

## Paso 4 — Configurar el correo de acceso en Supabase (con la URL de arriba)
Para que funcionen los emails de confirmación y de recuperar contraseña:
1. Entra en **https://supabase.com/dashboard** → proyecto **guardiaguardia**.
2. Ve a **Authentication → URL Configuration**.
3. En **Site URL** pon tu URL de Vercel (p.ej. `https://guardiaguardia-xxxx.vercel.app`).
4. En **Redirect URLs** añade: `https://guardiaguardia-xxxx.vercel.app/**`
5. Guarda. (Si quieres probar también en local, añade `http://localhost:3000/**`).

> Cuando me pases la URL, te confirmo estos pasos y seguimos con el onboarding (Fase 2).
