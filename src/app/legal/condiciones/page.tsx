import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Condiciones de uso · GuardiaGuardia" };

export default function CondicionesPage() {
  return (
    <article>
      <h1>Condiciones de uso</h1>
      <p>Última actualización: {LEGAL.lastUpdated}.</p>

      <h2>1. Aceptación</h2>
      <p>
        El uso de {LEGAL.appName} implica la aceptación plena de estas condiciones
        de uso, del aviso legal y de la política de privacidad. Si no estás de
        acuerdo, no utilices la aplicación.
      </p>

      <h2>2. Cuenta y acceso</h2>
      <p>
        Para usar el servicio debes registrarte con un correo electrónico válido y
        una contraseña. Eres responsable de mantener la confidencialidad de tus
        credenciales y de toda actividad realizada con tu cuenta.
      </p>

      <h2>3. Uso correcto</h2>
      <ul>
        <li>Utilizar la aplicación conforme a la ley y a estas condiciones.</li>
        <li>
          No introducir datos de terceros sin disponer de base legítima para ello.
        </li>
        <li>No intentar acceder a datos de otros servicios u organizaciones.</li>
      </ul>

      <h2>4. Datos introducidos por el usuario</h2>
      <p>
        El administrador es el único responsable de la veracidad y licitud de los
        datos que registra (médicos, ausencias, guardias) y de informar, en su
        caso, a las personas afectadas conforme a la normativa de protección de
        datos.
      </p>

      <h2>5. Disponibilidad</h2>
      <p>
        Trabajamos para mantener el servicio disponible, pero no garantizamos su
        funcionamiento ininterrumpido. Podremos realizar tareas de mantenimiento o
        actualización que afecten temporalmente al acceso.
      </p>

      <h2>6. Limitación de responsabilidad</h2>
      <p>
        {LEGAL.appName} es una herramienta de apoyo a la gestión. Las decisiones
        finales sobre el reparto de guardias corresponden al servicio responsable.
        En la medida permitida por la ley, el titular no responde de daños
        derivados del uso del servicio o de errores en los datos introducidos.
      </p>

      <h2>7. Modificaciones</h2>
      <p>
        Podemos actualizar estas condiciones. Publicaremos la versión vigente en
        esta página, indicando su fecha de actualización.
      </p>

      <h2>8. Legislación aplicable</h2>
      <p>
        Estas condiciones se rigen por la legislación española.
      </p>
    </article>
  );
}
