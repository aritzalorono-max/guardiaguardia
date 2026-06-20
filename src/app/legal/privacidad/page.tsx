import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Política de privacidad · GuardiaGuardia" };

export default function PrivacidadPage() {
  return (
    <article>
      <h1>Política de privacidad</h1>
      <p>Última actualización: {LEGAL.lastUpdated}.</p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        {LEGAL.entityName} (NIF/CIF {LEGAL.entityId}), con domicilio en{" "}
        {LEGAL.entityAddress} y correo de contacto {LEGAL.contactEmail}, es el
        responsable del tratamiento de los datos de las personas usuarias
        administradoras de {LEGAL.appName}.
      </p>

      <h2>2. Datos que tratamos</h2>
      <ul>
        <li>
          Datos de la cuenta del administrador: dirección de correo electrónico y
          credenciales de acceso.
        </li>
        <li>
          Datos del servicio introducidos por el administrador: nombre del
          hospital, especialidad, nombres y apellidos de los médicos, su
          categoría, ausencias y guardias.
        </li>
        <li>Datos técnicos mínimos necesarios para mantener la sesión.</li>
      </ul>

      <h2>3. Finalidad y base jurídica</h2>
      <p>
        Tratamos los datos para prestar el servicio de gestión de guardias
        (ejecución del contrato/condiciones de uso, art. 6.1.b RGPD) y para
        cumplir obligaciones legales aplicables (art. 6.1.c RGPD).
      </p>
      <p>
        Respecto a los datos de los médicos introducidos por el administrador, el
        servicio u hospital actúa como responsable de dichos datos y{" "}
        {LEGAL.appName} como encargado del tratamiento, conforme al art. 28 RGPD.
        El administrador garantiza disponer de base legítima para tratarlos.
      </p>

      <h2>4. Conservación</h2>
      <p>
        Conservamos los datos mientras la cuenta esté activa y, después, durante
        los plazos legalmente exigibles. Puedes solicitar la supresión cuando
        quieras.
      </p>

      <h2>5. Destinatarios y encargados</h2>
      <p>
        Utilizamos proveedores que actúan como encargados del tratamiento con
        servidores en la Unión Europea: <strong>Supabase</strong> (base de datos y
        autenticación) y <strong>Vercel</strong> (alojamiento). No cedemos datos a
        terceros salvo obligación legal.
      </p>

      <h2>6. Transferencias internacionales</h2>
      <p>
        Los datos se alojan en la Unión Europea. Si algún proveedor realizara
        tratamientos fuera del EEE, se aplicarían las garantías previstas en el
        RGPD (cláusulas contractuales tipo).
      </p>

      <h2>7. Derechos</h2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, supresión,
        oposición, limitación y portabilidad escribiendo a {LEGAL.contactEmail}.
        También puedes reclamar ante la Agencia Española de Protección de Datos
        (www.aepd.es).
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas para proteger los datos,
        incluyendo cifrado en tránsito y control de acceso por servicio.
      </p>
    </article>
  );
}
