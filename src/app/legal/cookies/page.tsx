import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Política de cookies · GuardiaGuardia" };

export default function CookiesPage() {
  return (
    <article>
      <h1>Política de cookies</h1>
      <p>Última actualización: {LEGAL.lastUpdated}.</p>

      <h2>1. Qué son las cookies</h2>
      <p>
        Una cookie es un pequeño archivo que se almacena en tu dispositivo al
        visitar un sitio web y permite, entre otras cosas, mantener tu sesión
        iniciada.
      </p>

      <h2>2. Cookies que utilizamos</h2>
      <p>
        {LEGAL.appName} utiliza exclusivamente <strong>cookies técnicas
        necesarias</strong>, imprescindibles para el funcionamiento del servicio.
        No utilizamos cookies analíticas, de publicidad ni de seguimiento.
      </p>
      <ul>
        <li>
          Cookies de sesión y autenticación (Supabase): mantienen tu sesión
          iniciada de forma segura mientras usas la aplicación.
        </li>
        <li>
          Almacenamiento local del navegador: recordamos que has aceptado este
          aviso de cookies para no volver a mostrarlo.
        </li>
      </ul>

      <h2>3. Consentimiento</h2>
      <p>
        Al tratarse de cookies técnicas necesarias, no requieren consentimiento
        previo conforme a la normativa vigente. Aun así, te informamos de su uso
        mediante el aviso correspondiente.
      </p>

      <h2>4. Cómo gestionarlas</h2>
      <p>
        Puedes eliminar o bloquear las cookies desde la configuración de tu
        navegador. Ten en cuenta que, si bloqueas las cookies técnicas, no podrás
        iniciar sesión ni utilizar la aplicación.
      </p>

      <h2>5. Contacto</h2>
      <p>
        Para cualquier duda sobre esta política, escríbenos a{" "}
        {LEGAL.contactEmail}.
      </p>
    </article>
  );
}
