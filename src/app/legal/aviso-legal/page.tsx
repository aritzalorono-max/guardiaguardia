import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Aviso legal · GuardiaGuardia" };

export default function AvisoLegalPage() {
  return (
    <article>
      <h1>Aviso legal</h1>
      <p>Última actualización: {LEGAL.lastUpdated}.</p>

      <h2>1. Titular del sitio</h2>
      <p>
        En cumplimiento del deber de información recogido en la Ley 34/2002, de
        Servicios de la Sociedad de la Información y de Comercio Electrónico
        (LSSI-CE), se facilitan los siguientes datos del titular:
      </p>
      <ul>
        <li>Titular: {LEGAL.entityName}</li>
        <li>NIF/CIF: {LEGAL.entityId}</li>
        <li>Domicilio: {LEGAL.entityAddress}</li>
        <li>Correo de contacto: {LEGAL.contactEmail}</li>
      </ul>

      <h2>2. Objeto</h2>
      <p>
        {LEGAL.appName} es una aplicación web destinada a la gestión y reparto de
        guardias médicas en servicios hospitalarios. El acceso y uso del sitio
        atribuye la condición de usuario e implica la aceptación de este aviso
        legal.
      </p>

      <h2>3. Propiedad intelectual e industrial</h2>
      <p>
        Los contenidos, el software, el diseño y el código de {LEGAL.appName} son
        titularidad del titular o de sus licenciantes y están protegidos por la
        normativa de propiedad intelectual e industrial. Queda prohibida su
        reproducción, distribución o transformación sin autorización.
      </p>

      <h2>4. Responsabilidad</h2>
      <p>
        El titular no se hace responsable del uso indebido de la plataforma ni de
        la veracidad o licitud de los datos introducidos por los usuarios
        administradores, que son los únicos responsables de la información que
        registran en sus servicios.
      </p>

      <h2>5. Legislación aplicable</h2>
      <p>
        Este aviso legal se rige por la legislación española. Para cualquier
        controversia, las partes se someten a los juzgados y tribunales que
        correspondan conforme a Derecho.
      </p>
    </article>
  );
}
