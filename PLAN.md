# GuardiaGuardia — Plan de construcción

> Gestor de guardias médicas multi-hospital / multi-servicio.
> Documento vivo: vamos marcando `[x]` lo que se completa. Si algo cambia, se actualiza aquí.

Última actualización: 2026-06-20

---

## 1. Visión en una frase

Una web donde **cada servicio de cada hospital** se da de alta, configura *cómo* hace sus
guardias (cada uno a su manera), mete a sus médicos, marca ausencias en un calendario visual,
genera un **reparto automático justo y editable**, lo **ajusta sobre la marcha** cuando hay
imprevistos (bajas, embarazos, salidas), y lo **comparte** con un enlace de solo lectura.

**Principio rector:** no existe "la forma correcta" de hacer guardias. El sistema es un
**motor de reglas configurable**, no una lógica fija.

---

## 2. Decisiones ya tomadas

- **Stack:** Next.js (React) + Supabase (Postgres, Auth, RLS) + despliegue en Vercel.
- **Multitenancy:** cada servicio aislado; un servicio nunca ve datos de otro (RLS por `service_id`).
- **Roles:** Admin del servicio / (futuro) Editor / Médico solo-lectura.
- **Enlace de compartir:** solo lectura, con caducidad y opción de regenerar (datos sensibles).
- **Festivos:** nacionales precargados + edición manual (autonómicos/locales se añaden a mano).
- **Cambios a mitad de ciclo:** soportados de serie (ver Fase 8).
- **Localizada vs. presencial:** modeladas como tipos distintos, con peso/carga configurable.
- **Idioma:** español; preparado para multi-idioma.
- **Datos personales (RGPD):** hosting en UE, enlaces con caducidad, auditoría de cambios.

---

## 3. Conceptos clave del modelo (el "cómo" de las guardias)

### 3.1. Plantilla de día (qué hace falta cada día)
Cada día necesita cubrir una serie de **puestos de guardia (slots)**. La plantilla puede variar
según el tipo de día (laborable / víspera de festivo / festivo / fin de semana). Ejemplos reales:
- Laborable: `1 localizada (adjunto)`.
- Fin de semana: `1 presencial (residente) + 1 localizada (adjunto)`.
- Otro hospital: `2 presenciales (adjunto)`. Otro: `todo localizada, sin presencial`.

Cada **slot** define: modalidad (**presencial / localizada / telefónica**), quién puede cubrirlo
(adjunto / residente / nivel R concreto), si es obligatorio o puede quedar vacío, y su **peso**.

### 3.2. Equidad del reparto (regla de oro)
**Objetivo principal:** que todos tengan el **mismo número EXACTO de cada tipo de guardia**
(laborables iguales, vísperas iguales, festivos iguales), no que "cuadren los puntos". Un festivo
NO se compensa con dos laborables. El sistema iguala el **conteo por categoría y modalidad**.

**Pesos / puntuación (rol secundario):** el peso solo se usa como **desempate** o como **último
recurso** cuando es matemáticamente imposible igualar los conteos exactos (p.ej. nº de festivos no
divisible entre el nº de médicos). Los pesos se calculan **automáticamente** pero son **editables**
dentro de la sección de reglas. Ejemplos de contexto que pueden cambiar el peso:
- Localizada de adjunto **con** residente de presencial → menos peso.
- La misma localizada **sin** residente → más peso (es peor).
- Festivo > víspera > laborable.

**Configurable por servicio:** que "localizada sin residente" cuente distinto es **opcional**: en
unos servicios se reparten todas por igual y en otros no. Es una regla activable (ver 3.4).

**Futuro:** afinar para garantizar conteos idénticos por tipo siempre que sea posible.

### 3.3. Tipos de día especial del médico (matriz 2 atributos)
Cada tipo se define con dos casillas independientes + color:
- ¿Cuenta como día trabajado? (afecta al reparto proporcional)
- ¿Puede hacer guardia ese día?

| Tipo (base) | ¿Trabaja? | ¿Guardia? |
|---|---|---|
| Vacaciones | No | No |
| Baja | Sí | Sí |
| Permiso | No | No |
| No disponible | Sí | No |

El servicio puede **crear tipos nuevos** marcando esas casillas. Opcional: que un tipo
bloquee también la víspera/día siguiente.

### 3.4. Reglas (activables/desactivables)
- **Legales (duras, no se violan):** descanso 12h tras guardia, libra día siguiente, no 2
  consecutivas, máx 48h/semana, no 2 findes seguidos, mín. días entre guardias, máx guardias/mes.
- **Internas (blandas, se intentan cumplir):** jornada parcial no penaliza (o sí, proporcional);
  presenciales solo residentes; localizadas solo adjuntos/residentes; R1 con tutor; reparto
  equitativo de festivos; coincidencias forzadas o prohibidas; refuerzo si falta residente;
  **"localizada sin residente cuenta distinto" (activable: en unos servicios sí, en otros no)**.
- **Topes:** máx guardias/mes distinto para residentes y adjuntos.
- **Histórico:** deuda/crédito por tipo arrastrada de periodos anteriores; reinicio anual;
  reseteo manual confirmando con `RESETEAR`.

### 3.5. Motor de reparto (algoritmo)
**Meta:** igualar el **conteo exacto por categoría/modalidad** entre médicos (ver 3.2), no sumar
puntos. El periodo siempre cubre **meses naturales completos**.

1. Calcular **cuota objetivo** por médico y categoría = nº de guardias de esa categoría a repartir,
   proporcional a días trabajados, ajustada por **deuda/crédito histórico** (quien hizo de más antes,
   ahora hace de menos).
2. **Fase A:** asignar primero los días difíciles (festivos/vísperas, menos gente disponible).
3. **Fase B:** rellenar laborables.
4. **Fase C (optimización):** intercambios (swaps) para **igualar los conteos por tipo** y cumplir
   reglas blandas. El peso solo desempata cuando los conteos no pueden ser idénticos.
5. Restricciones duras siempre: disponible ese día, no guardia ayer/mañana, no supera topes,
   respeta reglas legales activas.
6. Prioriza a quien lleva **más tiempo sin guardia** (reparto en el tiempo).
7. Si un día no se puede cubrir sin violar una regla dura → se marca como **hueco rojo** para
   que el admin decida (nunca un reparto inválido silencioso).
8. Todo cambio manual posterior queda **registrado** (auditoría).

---

## 4. Roadmap por fases (cada fase es usable)

### Fase 0 — Cimientos
- [ ] Proyecto Next.js + TypeScript + Tailwind.
- [ ] Conexión Supabase (proyecto, claves, cliente).
- [ ] Esquema base de datos inicial + RLS por servicio.
- [ ] Despliegue continuo en Vercel desde la rama.

### Fase 1 — Acceso (Auth)
- [ ] Registro de admin (email + contraseña).
- [ ] Login.
- [ ] Recuperar contraseña por email.
- [ ] Aislamiento de datos por servicio (RLS).

### Fase 2 — Onboarding (asistente por pasos)
- [ ] Datos del hospital: nombre, especialidad, comunidad/provincia, nº aprox. médicos.
- [ ] ¿Hay residentes? ¿Qué modalidades de guardia (presencial/localizada)?
- [ ] Plantillas de día (qué slots hace falta cubrir por tipo de día).
- [ ] Opción "configurar luego" para lo no esencial.

### Fase 3 — Médicos
- [ ] Alta/edición/baja: nombre, apellidos, tipo (adjunto / R1–R5).
- [ ] Marcas: activo (trabaja sí/no), hace guardias (sí/no).
- [ ] Importación rápida (pegar lista) — opcional.

### Fase 4 — Calendario de ausencias y festivos
- [ ] Calendario visual mensual; findes y festivos claramente marcados.
- [ ] Festivos nacionales precargados + edición manual.
- [ ] Tipos de día especial configurables (matriz trabaja/guardia + color).
- [ ] Asignar/editar ausencias por médico de forma visual (rangos).
- [ ] Cálculo de días trabajados (descontando no trabajados).

### Fase 5 — Configuración de guardias y reglas
- [ ] Editor de plantillas de día y slots (modalidad, quién, peso).
- [ ] Panel de reglas legales / internas / topes (marcar/desmarcar).
- [ ] Pesos por categoría y contexto (con/sin residente, festivo...).

### Fase 6 — Motor de reparto automático
- [ ] Elegir periodo a gestionar (nº de meses; normalmente trimestral).
- [ ] Cálculo de cuotas por médico y categoría (con histórico/deuda).
- [ ] Algoritmo de asignación (Fases A/B/C) con reglas duras y blandas.
- [ ] Detección y marcado de huecos sin cubrir.
- [ ] Tests del motor con casos de ejemplo (innegociable).

### Fase 7 — Edición manual y auditoría
- [ ] Editar el reparto a mano (asignar/quitar/intercambiar).
- [ ] Aviso si un cambio manual viola una regla.
- [ ] Registro de auditoría (quién, qué, cuándo, motivo).
- [ ] Borrador vs. publicado; versiones del reparto.

### Fase 8 — Cambios a mitad de ciclo (imprevistos)
- [ ] Marcar baja/ausencia sobrevenida con ventana (con o sin fecha de fin).
- [ ] **Liberar** las guardias futuras de esa persona en la ventana.
- [ ] Modo A: re-repartir automáticamente las liberadas.
- [ ] Modo B: **bolsa de guardias** — el **admin** recoge quién quiere cada una y las asigna;
      el resto va al algoritmo. (v1 sin login de médicos; en el futuro las pedirán online).
- [ ] **Reactivar** a la persona (vuelve antes) o **alargar** la baja, recalculando.
- [ ] Recalcular cuotas/equidad tras el cambio sin rehacer todo el ciclo.

### Fase 9 — Resumen, compartir y exportar
- [ ] Resumen final: tabla por médico (nº por tipo), calendario, avisos (huecos, cambios manuales).
- [ ] Enlace de solo lectura con caducidad / regenerar.
- [ ] Exportar a PDF e iCal (.ics) para el móvil de cada médico.
- [ ] Contadores e histórico; reseteo con `RESETEAR`.

---

## 5. Decisiones resueltas (antes dudas)

1. **Peso de las guardias:** automático y **editable** dentro de la sección de reglas. La equidad
   se mide por **conteo exacto por tipo**, no por suma de puntos; el peso solo desempata.
2. **Bolsa de guardias (Modo B):** en v1 la gestiona el **admin** (sin login de médicos). Cambiará
   en el futuro a peticiones online.
3. **"Cuenta distinto con/sin residente":** es **configurable por servicio** (regla activable):
   en unos se reparten por igual, en otros no.
4. **Periodos:** siempre **meses naturales completos**.

---

## 6. Notas de arquitectura (resumen técnico)

- **Frontend/Backend:** Next.js (App Router), Server Actions/API Routes, Tailwind, mobile-first.
- **Datos:** Supabase Postgres. Entidades núcleo: `service`, `user_membership`, `doctor`,
  `day_type`, `holiday`, `absence`, `guard_template`, `guard_slot`, `rule_set`, `cycle`,
  `assignment`, `assignment_audit`, `share_link`, `counter_history`.
- **Motor de reparto:** módulo TypeScript aislado y testeado, ejecutable en servidor.
- **Calidad:** tests del motor; CI en cada push; despliegue preview en Vercel por rama.
