# Despliegue Online (Render.com)

Actualmente, el proyecto se está desplegando en Render.com, tanto para el frontend (apps/web) como para el backend (apps/api), usando el plan gratuito y conectado directamente al repositorio de GitHub. Cada vez que se hace un push a la rama principal, Render realiza el deploy automático de ambos servicios.

## Problema encontrado: pnpm-lock.yaml desactualizado

Al intentar desplegar por primera vez, Render arrojó el siguiente error:

```
ERR_PNPM_OUTDATED_LOCKFILE Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with <ROOT>/apps/api/package.json
```

Esto ocurre cuando el archivo pnpm-lock.yaml no coincide con los package.json del proyecto (por ejemplo, si se cambió una dependencia y no se actualizó el lockfile).

### Solución

1. Abrir una terminal en la raíz del proyecto.
2. Ejecutar:
  ```sh
  pnpm install
  ```
  Esto actualiza el pnpm-lock.yaml según los package.json.
3. Agregar el lockfile actualizado:
  ```sh
  git add pnpm-lock.yaml
  ```
4. Hacer commit del cambio:
  ```sh
  git commit -m "fix: update pnpm-lock.yaml"
  ```
5. Subir los cambios a GitHub:
  ```sh
  git push
  ```

Render detectará el cambio y volverá a intentar el deploy automáticamente. Si todo está correcto, el error desaparecerá y la app se desplegará correctamente.
# KMCVet — Documento de Proyecto

> Versión: **v1.1.5** — Inicio: 24 de marzo de 2026  
> Estado: Desarrollo activo (Fases 0, 1 y 2 completas + nuevos módulos en producción)

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Objetivos Clave](#2-objetivos-clave)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Arquitectura del Sistema](#4-arquitectura-del-sistema)
5. [Navegación (Menús y Submenús)](#5-navegación-menús-y-submenús)
6. [Módulos del Sistema](#6-módulos-del-sistema)
7. [Modelo de Datos](#7-modelo-de-datos)
8. [Estrategia Offline-First](#8-estrategia-offline-first)
9. [Estrategia White-Label](#9-estrategia-white-label)
10. [Estructura del Repositorio](#10-estructura-del-repositorio)
11. [Fases del Proyecto (Roadmap)](#11-fases-del-proyecto-roadmap)
12. [Decisiones de Diseño](#12-decisiones-de-diseño)
13. [Registro de Cambios](#13-registro-de-cambios)

---

## 1. Visión General

**KMCVet** es un sistema de gestión integral para veterinarias que combina control de inventario y atención al cliente en una única plataforma moderna, multi-plataforma y preparada para operar sin conexión a internet.

El sistema está diseñado bajo una arquitectura **white-label**, lo que permite venderlo a distintas veterinarias con solo cambiar recursos visuales (logo, colores, nombre) sin modificar el código base.

---

## 2. Objetivos Clave

| # | Objetivo | Descripción |
|---|----------|-------------|
| 1 | **Offline-First** | El sistema funciona sin internet. Guarda datos en caché local y sincroniza automáticamente al recuperar conexión. |
| 2 | **Multi-plataforma** | Accesible desde navegador (web), móvil (Android/iOS) y escritorio (Windows/macOS/Linux). |
| 3 | **White-Label** | Cambio de marca (logo, nombre, colores) sin tocar código. Configurable por veterinaria. |
| 4 | **Gestión de Atención** | Reserva de horas, ficha de mascota, historial clínico, diagnóstico y responsable del paciente. |
| 5 | **Control de Inventario** | Registro de insumos, medicamentos, alimentos; control de entradas y salidas con alertas de stock bajo. |
| 6 | **Seguridad** | Autenticación por roles (admin, veterinario, recepcionista), datos cifrados en tránsito y en reposo. |

---

## 3. Stack Tecnológico

### Frontend / Aplicación Cliente
| Capa | Tecnología | Razón |
|------|-----------|-------|
| Framework UI | **React 19 + TypeScript** | Ecosistema maduro, soporte PWA, componentes reutilizables |
| Estilos | **Tailwind CSS** | Diseño moderno, personalizable (white-label via tokens CSS) |
| Estado global | **Zustand** | Liviano, fácil de serializar para persistencia offline |
| PWA / Offline | **Workbox (Service Worker)** | Cache de assets y sincronización en background |
| Base de datos local | **IndexedDB via Dexie.js** | Almacenamiento estructurado en el navegador, soporte para queries |
| Sincronización | **Background Sync API + cola propia** | Encola operaciones offline y las ejecuta al recuperar conexión |
| Formularios | **React Hook Form + Zod** | Validación robusta con schema tipado |
| Build | **Vite** | Rápido, soporta PWA plugin |

### Backend / API
| Capa | Tecnología | Razón |
|------|-----------|-------|
| Runtime | **Node.js 22 LTS** | Unificación con frontend en TS |
| Framework | **NestJS 11** | Estructura modular, decoradores, DI, fácil escalado |
| API | **REST + OpenAPI (Swagger)** | Documentación automática, fácil integración |
| ORM | **Prisma 6** | Type-safe, migraciones declarativas |
| Base de datos | **SQLite embebido** | Sin servidor externo, distribución JAR-like (`node dist/main.js`) |
| Auth | **JWT (access + refresh token) + bcryptjs** | Stateless, seguro, pure JS (sin binarios nativos) |
| Archivos | **Multer + carpeta local `/uploads`** | Fotos de mascotas servidas por NestJS |
| Validación | **class-validator + class-transformer** | Integrado con NestJS |

### Infraestructura / Distribución
| Componente | Tecnología |
|-----------|-----------|
| Sin Docker requerido | Un solo proceso Node.js sirve API + frontend estático |
| Build | Script custom `scripts/build-all.js` (shared → api → web) |
| Monorepo | **pnpm workspaces + Turborepo** (apps/web, apps/api, packages/shared) |

> ⚠️ **Decisión arquitectónica (2026-03-25):** Se eliminó la dependencia de Docker, PostgreSQL, Redis y MinIO. El sistema funciona como distribución JAR-like: `pnpm build` → `node apps/api/dist/main.js`. SQLite embebido reemplaza PostgreSQL. bcryptjs (JS puro) reemplaza bcrypt nativo.

---

## 4. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser / App)                  │
│                                                                 │
│  ┌──────────────┐    ┌───────────────┐    ┌──────────────────┐  │
│  │  React App   │◄──►│ Service Worker│    │  IndexedDB       │  │
│  │  (UI + State)│    │ (Cache layer) │◄──►│  (Dexie.js)      │  │
│  └──────┬───────┘    └───────┬───────┘    │  Cola de Sync    │  │
│         │                   │            └──────────────────┘  │
└─────────┼───────────────────┼────────────────────────────────┘
          │ HTTPS             │ Background Sync
          ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVIDOR (1 proceso)                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  NestJS API (REST)  ←→  SQLite (Prisma)                  │  │
│  │  Sirve: /api/*  +  frontend estático desde /public/      │  │
│  │  Archivos: /uploads/  (fotos de mascotas)                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de Sincronización Offline

```
[Acción del usuario]
        │
        ▼
¿Hay conexión?
   ├─ SÍ ──► Llamada directa a la API ──► Confirmed ──► Actualiza IndexedDB
   └─ NO ──► Guarda en IndexedDB (estado: "pendiente")
              └──► Encola en Background Sync
                        │
                        ▼
              [Se recupera conexión]
                        │
                        ▼
              Procesa cola de sincronización
                        │
                        ├─ Éxito ──► Marca registro como "sincronizado"
                        └─ Error ──► Reintenta (max 3 veces) ──► Alerta al usuario
```

---

## 5. Navegación (Menús y Submenús)

El sidebar izquierdo de la aplicación está dividido en 4 grupos de navegación. Cada ítem es una ruta independiente con su propia página y funcionalidad.

```
SIDEBAR
│
├── PRINCIPAL
│   └── Dashboard            /dashboard
│       Estadísticas del día, gráfico de ventas, metas diaria/mensual,
│       accesos rápidos, estado del sistema.
│
├── CLÍNICA
│   ├── Atención             /atencion
│   │   Agenda de citas en vista semanal y mensual por doctor.
│   │   Modal de nueva cita con búsqueda de tutor, selección de mascota
│   │   o creación inline. Historial clínico por mascota al hacer clic.
│   │
│   ├── Registro Animales    /animales
│   │   CRUD de tutores y mascotas. Formulario multi-paso (Tutor → Mascota
│   │   → Resumen). Foto de mascota. Historial de pesos. Búsqueda y filtro
│   │   por especie.
│   │
│   ├── Hospital             /hospital
│   │   Gestión de pacientes hospitalizados (hospedaje). Check-in con
│   │   búsqueda de mascota por especie y texto libre. Vista de hospedajes
│   │   activos con tarjetas de estado. Historial de hospedajes finalizados.
│   │   Checkout (dar de alta).
│   │
│   └── Ventas               /ventas
│       Cobro en punto de venta. Selector de tipo de documento
│       (boleta/factura). RUT cliente opcional/obligatorio según tipo.
│       Historial de ventas con badge de tipo (BOL/FCT/NC) y N° folio.
│       Cobros pendientes (sin folio). Nota de crédito por venta.
│
├── GESTIÓN
│   ├── Inventario           /inventario
│   │   CRUD de productos con categorías (medicamento/alimento/accesorio/
│   │   clínico/otro). Entrada de stock con documento, proveedor e ítems.
│   │   Control de stock mínimo y alertas de vencimiento.
│   │
│   ├── Caja                 /caja
│   │   Arqueo y cuadre diario de caja. Declaración de efectivo por
│   │   denominaciones chilenas (billetes y monedas vigentes). Medios de
│   │   pago: efectivo, tarjeta, transferencia. Comparación contra ventas
│   │   del sistema. Diferencia cuadrada/descuadrada. Historial de cierres
│   │   anteriores. Exportar cierre como HTML imprimible.
│   │
│   └── Personal             /personal
│       Gestión del equipo de trabajo. CRUD de miembros del staff con cargo
│       (médico veterinario, técnico, recepcionista, administrativo, etc.),
│       color identificador, email y teléfono. Vista de turnos semanales
│       en grilla navegable: tipo de turno (Día / Tarde / Noche / Libre)
│       asignable por celda staff × fecha.
│
└── SISTEMA
    └── Configuración        /configuracion
        Panel de configuración general dividido en 7 pestañas:
        ├── Mi Clínica     — Datos de la clínica: nombre, eslogan, datos
        │                    tributarios SII (RUT empresa, razón social, giro,
        │                    resolución SII, tipo DTE), dirección y contacto.
        │                    Logo y plantillas de documentos (boleta, factura,
        │                    nota de crédito).
        ├── Doctores       — Gestión de personal médico que aparece en la agenda.
        ├── Tipos Atención — Alta/edición de motivos de cita con precio base.
        │                    Botón para cargar defaults predefinidos.
        ├── Documentos     — Carga de plantillas HTML para boleta, factura y NC.
        ├── Folios         — Rangos de folios SII por tipo de documento.
        │                    Progreso (van/quedan), vencimiento. Exportar CSV.
        ├── Metas          — Configuración de meta de ventas diaria y mensual.
        │                    Visible como barra de progreso en el Dashboard.
        └── Hospital       — Configuración de parámetros del módulo de hospedaje
                             (precio por noche, capacidad máxima, etc.).
```

---

## 6. Módulos del Sistema

### 6.1 Módulo: Atención al Cliente

#### Funcionalidades
- **Agenda / Reservas** ✅ _(implementado en UI — 2026-03-25)_
  - **Vista semanal** (Lun–Dom) con grilla de tiempo 09:00–21:00
    - 3 sub-columnas por día, una por doctor (Doctor 1, Doctor 2, Doctor 3)
    - Clic en columna de doctor + slot libre → cita asignada a ese doctor
    - Bloques de cita con color de cada doctor
    - Slots ocupados no son clicables
  - **Vista mensual** — grilla de calendario mes completo
    - Chips de citas coloreados por doctor en cada celda
    - Botón `+` por celda para nueva cita (aparece en hover)
    - Clic en día → panel lateral muestra sus citas
    - Navegación ±1 mes
  - **Toggle Semana / Mes** en el header
  - Slots de reserva: **15 min**, **30 min**, **1 hora**
  - Modal de nueva cita: ✅ _(v0.6.0 — rediseñado)_
    - Vista semanal: doctor y hora pre-asignados, solo se elige duración, tutor/mascota, motivo
    - Vista mensual: se elige doctor, hora, duración, tutor/mascota, motivo
    - **Búsqueda de tutor por RUT**: input + botón Buscar (también responde Enter)
      - Si se encuentra: muestra card con nombre/documento + chips de mascotas del tutor para seleccionar
      - Botón **"+ Agregar nueva mascota"**: mini-formulario inline (nombre + especie + sexo) que crea la mascota vinculada y la selecciona
      - Si no se encuentra: aviso con opción de ingresar manualmente (ingreso rápido)
    - Badge de selección: muestra mascota y tutor elegidos con botón para limpiar
    - **Motivos predefinidos** (8 categorías + campo libre "Otro")
    - Duración: botones deshabilitados si el slot queda ocupado
  - **Persistencia en SQLite** ✅: `GET /api/citas?desde=&hasta=`, `POST /api/citas`, `DELETE /api/citas/:id`
  - Citas vinculadas a `Pet` real en BD: si se envía `mascotaId`, se usa directamente; si no, se crea pet por nombre
  - **Citas devuelven `mascotaId` y `propietario`** ✅ _(v0.7.0)_: el `mapCita()` ahora incluye `mascotaId` e incluye nombre del propietario (`mascota.propietario.nombre`)
  - **Clic en cita → Modal de detalle** ✅ _(v0.7.0)_:
    - Disponible tanto en chips del grid semanal como en el panel lateral
    - Muestra: doctor asignado (con color), fecha, hora, duración, mascota, tutor, motivo
    - **Historial de atenciones de la mascota** (no del tutor): lista todas las citas previas de esa mascota ordenadas de más reciente a más antigua, con doctor, fecha, hora y motivo
    - Si la mascota fue ingresada sin ID (manual), muestra "sin historial vinculado"
    - Botón **Eliminar cita** integrado en el modal
  - **Endpoint historial** ✅ _(v0.7.0)_: `GET /api/citas/historial/:mascotaId` — devuelve todas las citas de esa mascota incluyendo propietario
  - Doctores: 3 hardcodeados con colores distintos (emerald / teal / cyan)
  - Panel lateral: disponibilidad del día por doctor + listado de citas del día seleccionado (clickeables) + botón eliminar
  - Navegación semana anterior / siguiente / hoy
  - Las citas usan **fecha real** `"YYYY-MM-DD"` (no índice), por lo que persisten al navegar entre semanas/meses
  - Estados: `pendiente` / `confirmada` / `en_curso` / `completada` / `cancelada`

- **Ficha del Paciente (Mascota)**
  - Nombre, especie, raza, fecha de nacimiento, sexo, color, microchip
  - Foto de la mascota
  - Peso histórico (registro por visita)
  - Alergias conocidas y condiciones previas

- **Ficha del Tutor** _(antes: Propietario)_
  - Nombre completo, RUT/DNI, teléfono, email, dirección
  - Relación con mascota/s (puede tener varias)
  - Búsqueda por RUT desde el modal de nueva cita → `GET /api/animales/buscar-tutor?rut=XXX`

- **Consulta / Atención**
  - Fecha, hora, veterinario responsable
  - Motivo de consulta
  - Diagnóstico (texto libre + CIE-Vet o clasificación propia)
  - Tratamiento indicado
  - Medicamentos recetados (vinculados al inventario)
  - Próxima cita sugerida
  - Archivos adjuntos (radiografías, análisis)

### 6.2 Módulo: Inventario

#### Funcionalidades
- **Categorías de producto**
  - Medicamentos
  - Alimentos / Dietas especiales
  - Insumos y materiales (jeringa, gasas, etc.)
  - Equipamiento menor

- **Gestión de productos**
  - Código interno / código de barras
  - Nombre, descripción, unidad de medida
  - Stock actual, stock mínimo (alerta), stock máximo
  - Fecha de vencimiento (para medicamentos)
  - Proveedor asociado

- **Movimientos de stock**
  - **Entrada**: compra a proveedor (número de factura, cantidad, precio)
  - **Salida**: consumo en atención (vinculado a consulta) o venta directa
  - **Ajuste**: corrección manual con justificación

- **Reportes**
  - Stock actual por categoría
  - Historial de movimientos por producto
  - Productos próximos a vencer
  - Productos bajo stock mínimo

### 6.3 Módulo: Usuarios y Roles

| Rol | Permisos |
|-----|---------|
| **Admin** | Acceso total: configuración, reportes, usuarios, white-label |
| **Veterinario** | Agenda propia, fichas, diagnósticos, recetas |
| **Recepcionista** | Agenda general, ficha propietario/mascota, no diagnóstico |
| **Inventarista** | Módulo inventario completo, sin atención |

### 6.4 Módulo: Configuración

Panel dividido en **7 pestañas**:

| Pestaña | Funcionalidad |
|---------|--------------|
| **Mi Clínica** | Nombre fantasía, eslogan, logo, plantillas de documentos. Datos tributarios SII: razón social, RUT empresa, giro, resolución SII, tipo DTE (39=boleta afecta / 41=boleta exenta). Dirección (calle, comuna, ciudad). Contacto (email, teléfonos). |
| **Doctores** | CRUD de personal médico que aparece en la agenda. Color identificador. Registro de médico veterinario, técnico veterinario, recepcionista, etc. |
| **Tipos de Atención** | Alta/edición/toggle de motivos de cita con precio base. Carga masiva de defaults predefinidos. |
| **Documentos** | Subida de plantillas HTML para boleta, factura y nota de crédito. Vista previa del archivo actual. |
| **Folios** | Rangos de folios SII por tipo (boleta/factura/nota_credito). Número desde/hasta/actual, vencimiento, estado visual (van/quedan). Exportar historial de folios a CSV. |
| **Metas** | Meta de ventas diaria y mensual en CLP. Se visualizan como barra de progreso en el Dashboard. |
| **Hospital** | Parámetros del módulo de hospedaje: precio por noche, capacidad máxima, régimen de alimentación por defecto. |

### 6.5 Módulo: Ventas ✅

- Cobro en punto de venta con ítems (nombre, cantidad, precio unitario)
- Selector de tipo de documento: boleta / factura
- Campo RUT cliente: opcional en boleta, obligatorio en factura
- Asignación automática de folio desde rango activo SII
- Ventas sin folio disponible → estado PENDIENTE; se completan retroactivamente
- Historial con badge tipo (BOL / FCT / NC), número de folio, total en rojo para NC
- **Nota de Crédito**: modal con motivo, genera documento DTE 61 referenciando la venta original
- Impresión / exportación como HTML (usa plantilla cargada en Configuración → Documentos)

### 6.6 Módulo: Hospital ✅ _(v1.1.x)_

Gestión de pacientes hospitalizados (internados / en hospedaje).

#### Funcionalidades
- **Check-in (Nuevo ingreso)**
  - Modal de búsqueda de mascota: filtros por especie (pills dinámicos según datos reales) + búsqueda libre por nombre/raza/tutor
  - Select tipo listbox con formato `🐶 Max (Labrador) — Juan Pérez`
  - Campos: fecha de ingreso, diagnóstico/motivo, notas adicionales
- **Vista Activos**: tarjetas de hospedaje activo con días transcurridos, mascota, tutor, diagnóstico, estado
- **Vista Historial**: tabla de hospedajes finalizados con fecha ingreso/alta
- **Check-out (Dar de alta)**: confirmación → actualiza estado a `finalizado` en BD
- **Estadísticas rápidas**: total hospedajes, activos hoy, finalizados este mes

#### Modelo en BD
```
Hospedaje
├── id, tenantId, mascotaId, propietarioId
├── fechaIngreso, fechaAlta
├── diagnostico, notas
└── estado (activo | finalizado)
```

#### Endpoints
- `GET /api/hospital?estado=activo|finalizado` — lista por estado
- `POST /api/hospital` — registrar ingreso (check-in)
- `PUT /api/hospital/:id/checkout` — dar de alta (check-out)

### 6.7 Módulo: Caja ✅ _(v1.1.x)_

Arqueo y cuadre de caja al cierre del día.

#### Funcionalidades
- **Cuadre del día**
  - Denominaciones chilenas vigentes: billetes ($20.000, $10.000, $5.000, $2.000, $1.000) y monedas ($500, $100, $50, $10)
  - Ingreso de cantidad por denominación → cálculo automático del total en efectivo
  - Declaración de montos por medio de pago: efectivo, tarjeta, transferencia
  - Saldo anterior (arrastrado del cierre previo)
  - Comparación automática contra total de ventas del día (desde BD)
  - Indicador de diferencia: **✓ Cuadrada** (diferencia < $1) o monto de descuadre en rojo
  - Registra usuario que hace el cierre (desde JWT)
- **Historial de cierres**: lista de cierres anteriores con fecha, totales y diferencia
- **Exportar cierre**: genera HTML imprimible con resumen de medios de pago y detalle de ventas del día
- **Eliminar cierre**: borrado desde el historial

#### Endpoint backend
- `GET /api/caja/historial` — lista de cierres
- `POST /api/caja` — registrar cierre del día
- `DELETE /api/caja/:id` — eliminar cierre
- `GET /api/caja/total-mes` — total de ventas del mes en curso (para Dashboard)

### 6.8 Módulo: Personal ✅ _(v1.1.x)_

Gestión del equipo de trabajo de la veterinaria.

#### Funcionalidades
- **Lista de staff**
  - CRUD de miembros: nombre, cargo, email, teléfono, notas, color identificador
  - Cargos disponibles: Médico Veterinario, Técnico Veterinario, Recepcionista, Auxiliar, Administrativo
  - Color por staff (emerald, teal, cyan, blue, violet, rose) — usado también en agenda
  - Eliminación con confirmación (borra también sus turnos)
- **Turnos semanales**
  - Grilla staff × día (Lun–Dom) con navegación de semana
  - Tipos de turno: DÍA, TARDE, NOCHE, LIBRE — asignados por clic en celda
  - Vista responsive: celdas con color e ícono del tipo de turno
  - Actualización en tiempo real en BD (PUT por celda; BORRAR limpia la celda)

#### Modelo en BD
```
Staff
├── id, tenantId, nombre, cargo, email, telefono, notas, color, activo

Turno
├── id, staffId, tenantId, fecha (YYYY-MM-DD), tipo (DIA|TARDE|NOCHE|LIBRE), notas
```

#### Endpoints
- `GET|POST /api/personal` — lista y creación de staff
- `PUT|DELETE /api/personal/:id` — editar y eliminar miembro
- `GET /api/personal/turnos?desde=&hasta=` — turnos en rango de fechas
- `POST /api/personal/turnos` — crear/actualizar turno de una celda
- `DELETE /api/personal/turnos/:id` — borrar turno de una celda

### 6.9 Dashboard ✅ _(mejorado en v1.1.x)_

- **Stats del día**: citas hoy, total animales registrados, total productos, stock bajo
- **Gráfico de ventas del día**: barras SVG por hora con línea de meta diaria
- **Meta diaria**: total vendido hoy vs meta configurada → barra de progreso + `Faltan $X para la meta`
- **Meta mensual**: total del mes en curso vs meta mensual → barra de progreso + `✓ Meta alcanzada`
- **Acciones rápidas**: Nueva cita, Registrar animal, Nueva venta, Ver inventario
- **Estado del sistema**: servidor, BD, sesión activa

---

## 7. Modelo de Datos

> Nota: Definición resumida del esquema Prisma. El archivo completo es `apps/api/prisma/schema.prisma`.

```
Tenant (Veterinaria)
├── id, nombre, slug, logoUrl, config_json
├── nombreEmpresa, rutEmpresa, giroClinica   ← datos tributarios SII
├── direccionClinica, comunaClinica, ciudadClinica
├── eslogan, resolucionSII, dteTipo (39|41)
├── emailClinica, telefonos
├── plantillaBoletaUrl, plantillaFacturaUrl, plantillaNotaCreditoUrl
├── → Usuarios (1:N)
├── → Mascotas (1:N)
├── → Productos (1:N)
├── → Staff (1:N)
└── → FolioRange (1:N)

Usuario
├── id, tenant_id, nombre, email, password_hash, rol
└── → Citas (1:N como veterinario)

Propietario (Tutor)
├── id, tenant_id, nombre, documento, telefono, email, direccion
└── → Mascotas (1:N)

Mascota
├── id, tenant_id, propietario_id, nombre, especie, raza
├── fecha_nacimiento, sexo, color, microchip, foto_url
├── → Consultas (1:N)
└── → Hospedajes (1:N)

Cita
├── id, tenant_id, mascota_id, veterinario_id
├── fecha_hora, duracion_min, motivo, estado
└── → Consulta (1:1)

Consulta
├── id, tenant_id, cita_id, veterinario_id, mascota_id
├── peso_kg, temperatura, diagnostico, tratamiento, notas
└── → ItemsReceta (1:N)

Producto
├── id, tenant_id, nombre, codigo, categoria, unidad
├── stock_actual, stock_minimo, precio_costo, precio_venta
└── → MovimientosStock (1:N)

Sale (Venta)
├── id, tenantId, tipo (boleta|factura|nota_credito)
├── folio, rutCliente, estado (PENDIENTE|COMPLETADA)
├── ventaReferenciaId (para Nota de Crédito)
├── total, subtotal, iva, descuento
└── → SaleItems (1:N)

SaleItem
├── id, saleId, nombre, cantidad, precioUnitario, tipo (producto|servicio)

FolioRange
├── id, tenantId, tipo (boleta|factura|nota_credito)
├── desde, hasta, actual, vencimiento, activo

Hospedaje
├── id, tenantId, mascotaId, propietarioId
├── fechaIngreso, fechaAlta
├── diagnostico, notas
└── estado (activo | finalizado)

Staff
├── id, tenantId, nombre, cargo, email, telefono, notas, color, activo
└── → Turnos (1:N)

Turno
├── id, staffId, tenantId, fecha (YYYY-MM-DD)
├── tipo (DIA | TARDE | NOCHE | LIBRE)
└── notas

CajaCierre
├── id, tenantId, fechaDia, usuarioId
├── totalVentas, totalEfectivo, totalTarjeta, totalTransferencia
├── saldoAnterior, diferencia
└── denominaciones (JSON)

Meta
├── id, tenantId, tipo (diaria | mensual)
└── monto
```

---

## 8. Estrategia Offline-First

### Principios
1. **El cliente es la fuente de verdad mientras no hay conexión.** Todo se guarda localmente primero.
2. **La sincronización es eventual y transparente.** El usuario no necesita hacer nada manual.
3. **Los conflictos se resuelven con "last-write-wins" por timestamp** (solución simple para v1). Se puede escalar a CRDT en versiones futuras.

### Implementación

```
IndexedDB (Dexie.js)
├── tabla: sync_queue
│   ├── id, operacion (create|update|delete)
│   ├── entidad, payload, timestamp_local
│   └── estado (pendiente|enviando|error)
├── tabla: mascotas (copia local)
├── tabla: citas (copia local)
├── tabla: productos (copia local)
└── tabla: consultas (copia local)
```

**Service Worker (Workbox)**
- Cache de assets de la app en primer arranque (App Shell)
- Intercepta llamadas a la API
- Si hay red: pasa la llamada y actualiza IndexedDB
- Si no hay red: sirve desde IndexedDB y encola en `sync_queue`

**Background Sync**
- Escucha evento `sync` del navegador al volver la conexión
- Procesa `sync_queue` en orden FIFO
- Reporta resultados al estado global (Zustand)

---

## 9. Estrategia White-Label

### Configuración por Tenant
Cada veterinaria tiene un `slug` único (ej: `clinicamax`) que determina:
1. Subdominio: `clinicamax.vetcare.app` — o dominio propio vía CNAME
2. Archivo de configuración que se sirve en `/api/tenant/config`:
```json
{
  "nombre": "Clínica Max",
  "logo_url": "/assets/tenants/clinicamax/logo.png",
  "color_primario": "#2563EB",
  "color_secundario": "#10B981",
  "moneda": "CLP",
  "timezone": "America/Santiago",
  "modulos": ["atencion", "inventario"]
}
```

### En el Frontend
- Al cargar la app, se hace `GET /api/tenant/config`
- Se inyectan CSS custom properties: `--color-primary`, `--color-secondary`
- El logo se reemplaza dinámicamente
- El título del documento HTML y favicon se actualizan
- Los colores de Tailwind se generan desde los tokens CSS

### Proceso para nueva veterinaria
1. Crear registro en tabla `Tenant`
2. Subir logo a MinIO
3. Configurar DNS (opcional: dominio propio como `clinicamax.kmcvet.app`)
4. Crear usuario administrador inicial
5. Listo — sin despliegue de código nuevo

---

## 10. Estructura del Repositorio

```
kmcvet/
├── apps/
│   ├── web/                  # React PWA (Vite)
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── atencion/     # Citas, fichas, consultas
│   │   │   │   ├── inventario/   # Productos, stock, compras
│   │   │   │   ├── usuarios/     # Gestión de usuarios
│   │   │   │   └── configuracion/# White-label, ajustes
│   │   │   ├── shared/           # Componentes, hooks, utils comunes
│   │   │   ├── store/            # Zustand stores
│   │   │   ├── offline/          # Dexie, sync queue, SW registration
│   │   │   └── main.tsx
│   │   ├── public/
│   │   │   └── sw.js             # Service Worker (generado por Workbox)
│   │   └── vite.config.ts
│   │
│   └── api/                  # NestJS API
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── tenants/
│       │   │   ├── atencion/
│       │   │   ├── inventario/
│       │   │   └── usuarios/
│       │   ├── common/           # Guards, pipes, interceptors
│       │   ├── prisma/           # Schema, migrations, seed
│       │   └── main.ts
│       └── Dockerfile
│
├── packages/
│   └── shared/               # Tipos, schemas Zod compartidos web + api
│       └── src/
│           ├── types/
│           └── schemas/
│
├── infra/
│   ├── docker-compose.yml    # PostgreSQL, Redis, MinIO, Nginx
│   ├── nginx.conf
│   └── .env.example
│
├── docs/
│   └── PROJECT.md            # Este archivo
│
├── turbo.json
├── package.json
└── README.md
```

---

## 11. Fases del Proyecto (Roadmap)

### Fase 0 — Fundamentos ✅ _completada_
- [x] Definición de requerimientos
- [x] Selección de stack tecnológico
- [x] Arquitectura del sistema
- [x] Modelo de datos inicial
- [x] Configurar monorepo (Turborepo + pnpm workspaces)
- [x] ~~Docker Compose con PostgreSQL, Redis, MinIO~~ → **reemplazado por SQLite embebido**
- [x] Proyecto base NestJS con Prisma (SQLite)
- [x] Proyecto base React PWA con Vite + Tailwind
- [x] Sistema de autenticación JWT multi-tenant (bcryptjs)
- [x] Seed de datos de prueba (tenant demo, admin, vet, mascota Max)
- [x] Build sin Docker: `node scripts/build-all.js` → `node apps/api/dist/main.js`

### Fase 1 — Core: Atención al Cliente ✅ _(base completa)_
- [x] **Agenda semanal UI**: grilla 09:00–21:00, slots 15/30/60 min, 3 columnas por doctor
- [x] **Agenda mensual UI**: calendario mensual con chips de citas, toggle Semana/Mes
- [x] **Doctores en agenda**: Doctor 1/2/3 con colores, columna dedicada, disponibilidad en tiempo real
- [x] **Motivos predefinidos**: 8 categorías + campo "Otro" libre en modal de nueva cita
- [x] **Citas con fecha real**: modelo usa `"YYYY-MM-DD"`, persisten al navegar
- [x] **Registro de Animales UI + API**: formulario multi-paso 3 pasos (Tutor → Mascota → Resumen), foto upload, 6 especies con razas, historial de peso. `GET/POST/PUT/DELETE /api/animales` → SQLite
- [x] **Inventario UI + API**: formulario 3 pestañas (Documento/Producto/Stock), cálculo IVA/total, margen automático, alertas stock/vencimiento. `GET/POST/PUT /api/inventario` → SQLite
- [x] **Diseño veterinario**: sidebar verde, tema emerald/green en toda la app
- [x] **Dashboard**: stats, acciones rápidas, estado del sistema
- [x] **Encoding UTF-8 correcto**: todos los acentos se renderizan bien en todos los archivos
- [x] **Persistencia citas en SQLite**: `GET /api/citas?desde=&hasta=`, `POST /api/citas`, `DELETE /api/citas/:id`
- [x] **Carga de citas por rango**: `useEffect` carga citas al cambiar semana/mes/vista
- [x] **Auth guard (PrivateRoute)**: páginas protegidas redirigen a `/login` si no hay token JWT
- [x] **Renombrado Propietario → Tutor**: toda la UI usa el término correcto
- [x] **Modal nueva cita mejorado**: búsqueda de tutor por RUT, selección de mascota registrada, mini-formulario inline para nueva mascota
- [x] **Endpoint buscar-tutor**: `GET /api/animales/buscar-tutor?rut=XXX` devuelve tutor + mascotas
  - [x] **Modal de detalle de cita**: información completa + historial por mascota al hacer clic en cualquier cita
  - [x] **Historial de atenciones por mascota**: `GET /api/citas/historial/:mascotaId` — vinculado por `mascotaId`, no por tutor
  - [ ] Ficha de consulta (diagnóstico, tratamiento)
- [ ] Offline: operaciones desde IndexedDB
- [ ] Sincronización automática al recuperar conexión

### Fase 2 — Core: Inventario ✅ _(avanzada)_
- [x] CRUD Productos con categorías (medicamento/alimento/accesorio/clínico/otro)
- [x] Registro de entradas con documento (boleta/factura/nota de débito), proveedor e ítems
- [x] Control de stock mínimo con alertas visuales (⚠ bajo)
- [x] Alerta de vencimiento próximo (≤ 30 días)
- [x] Movimientos de stock automáticos en cada entrada/ajuste
- [x] Proveedores deduplicados por nombre dentro del tenant
- [ ] Registro de salidas (consumo en consulta / venta)
- [ ] Ajustes manuales de stock con justificación
- [ ] Reportes básicos (stock bajo, próximos a vencer)
- [ ] Offline: movimientos encolados y sincronizados

### Fase 3 — Ventas, Caja y Documentos SII ✅ _(completada)_
- [x] **Sistema de Folios SII**: rango desde/hasta/actual por tipo de documento (boleta/factura/nota_credito), vencimiento, UI en Configuración → Folios con historial (van/quedan)
- [x] **Ventas en POS**: selector tipoDoc, RUT cliente, folio automático desde rango activo
- [x] **Ventas PENDIENTE/COMPLETADA**: venta sin folio queda pendiente; se completa retroactivamente
- [x] **Nota de Crédito (DTE 61)**: modal con motivo, referencia al doc original, intento de asignación de folio NC
- [x] **Historial ventas mejorado**: badge BOL/FCT/NC + N° folio, total NC en rojo
- [x] **Plantillas documentos SII**: `template-boleta.html` (DTE 39/41), `template-factura.html` (DTE 33), `template-nota-credito.html` (DTE 61) conforme a Res. Ex. N°11/2003 y N°74/2014
- [x] **Módulo Caja**: arqueo diario con denominaciones chilenas, medios de pago, cierre con diferencia, historial, exportar HTML
- [x] **Exportar folios CSV**: desde Configuración → Folios
- [x] **Dashboard meta mensual**: barra de progreso del mes en curso vs meta configurada

### Fase 4 — Hospital y Personal ✅ _(completada)_
- [x] **Módulo Hospital**: check-in con búsqueda y filtros de especie, tarjetas de hospedaje activo, checkout, historial
- [x] **Módulo Personal**: CRUD de staff, asignación de turnos semanales (Día/Tarde/Noche/Libre)
- [x] **Configuración ampliada**: Mi Clínica con datos tributarios SII completos (9 nuevos campos)
- [x] **Versión v1.1.5** del sistema

### Fase 5 — White-Label y Multi-Tenant _(pendiente)_
- [ ] Panel de configuración por veterinaria
- [ ] Carga dinámica de logo y colores
- [ ] Sistema de dominios personalizados
- [ ] Panel de superadmin (gestión de tenants)
- [ ] Onboarding de nueva veterinaria

### Fase 6 — Mejoras y Pulido _(pendiente)_
- [ ] Ficha de consulta (diagnóstico, tratamiento) vinculada a cita
- [ ] Historial clínico por mascota con línea de tiempo
- [ ] Aplicación móvil (Capacitor sobre la PWA)
- [ ] Notificaciones push (recordatorio de citas)
- [ ] Estadísticas y reportes avanzados
- [ ] Exportación a PDF (fichas, recetas, reportes)
- [ ] Backup automático por tenant
- [ ] Dark mode
- [ ] Inyección automática de variables `{{NOMBRE_EMPRESA}}` en plantillas desde el backend

### Fase 7 — Comercialización _(pendiente)_
- [ ] Landing page de producto
- [ ] Proceso de contratación/suscripción
- [ ] Documentación para administradores
- [ ] Soporte multi-idioma (i18n)

---

## 12. Decisiones de Diseño

| Decisión | Alternativas consideradas | Razón de la elección |
|----------|--------------------------|---------------------|
| PWA sobre app nativa | React Native, Flutter | Una sola base de código, cero instalación, actualización inmediata |
| Turborepo monorepo | repos separados | Tipos compartidos entre web y api sin publicar paquete |
| **SQLite sobre PostgreSQL** | PostgreSQL, MySQL | Sin servidor externo, distribución JAR-like, ideal para clínicas pequeñas |
| **bcryptjs sobre bcrypt** | bcrypt nativo | Pure JS, sin binarios compilados, funciona en cualquier OS |
| JWT multi-tenant con claim `tenantId` | Subdomain detection | Más seguro, funciona offline y en dominio propio |
| Dexie.js sobre PouchDB | PouchDB, localStorage | API más moderna, mejor TypeScript, más liviano |
| Prisma sobre TypeORM | TypeORM, Drizzle | Migraciones declarativas, codegen de tipos, studio visual |
| NestJS sobre Express puro | Express, Fastify | Estructura modular obligatoria, ideal para proyectos grandes |
| Agenda semanal custom sobre React Big Calendar | React Big Calendar, FullCalendar | Sin dependencias externas, control total del diseño, más liviano |
| **Fecha real en Cita** (`"YYYY-MM-DD"`) en lugar de índice de semana | Índice 0–6 | Las citas persisten al navegar semanas/meses; compatible con vista mensual |
| **Escritura de archivos TSX vía Node.js** en lugar de PowerShell | PowerShell Set-Content | PowerShell 5.x lee scripts en ANSI y corrompe UTF-8; Node.js garantiza encoding correcto |
| **PrivateRoute en router** sobre guardias en cada componente | `useEffect` con redirect en cada página | Un único punto de control, más limpio y consistente; redirige antes de renderizar cualquier componente protegido |
| **Término "Tutor"** en lugar de "Propietario" | "Dueño", "Propietario", "Cliente" | Terminología médico-veterinaria correcta; el tutor tiene responsabilidad legal sobre el paciente animal |
| **`mascotaId` opcional en `POST /api/citas`** | solo nombre de mascota | Permite vincular citas a fichas reales sin romper el ingreso rápido por texto libre |
| **Historial por mascota, no por tutor** | historial por tutor (dueño) | El tutor puede tener varias mascotas; el historial clínico es del paciente, no del dueño |
| **`JWT_EXPIRES_IN=8h`** | 15 minutos (valor anterior) | Token de 15 min expiraba en plena jornada de trabajo causando 401 en todas las peticiones |

---

## 13. Registro de Cambios

| Fecha | Versión | Descripción | Autor |
|-------|---------|-------------|-------|
| 2026-03-24 | 0.1.0 | Creación del documento inicial. Definición de stack, arquitectura, módulos y roadmap. | — |
| 2026-03-24 | 0.1.1 | Nombre del producto definido: **KMCVet**. | — |
| 2026-03-25 | 0.2.0 | Decisión arquitectónica: eliminación de Docker/PostgreSQL/Redis/MinIO. Migración a SQLite embebido + bcryptjs. Sistema JAR-like (`node dist/main.js`). Build custom `scripts/build-all.js`. | — |
| 2026-03-25 | 0.2.1 | Implementación inicial UI: Login verde veterinario, sidebar con grupos de menú, Dashboard con stats y acciones rápidas. | — |
| 2026-03-25 | 0.2.2 | Nuevo módulo Registro de Animales: tabla de pacientes, búsqueda, filtro por especie. Seed con mascota demo (Max). | — |
| 2026-03-25 | 0.3.0 | Módulo Atención: agenda **semanal** con grilla horaria 09:00–21:00, slots de 15 min/30 min/1 hora, clic directo en grilla para crear citas, modal con formulario completo, panel lateral de citas del día. | — |
| 2026-03-25 | 0.3.1 | Fix encoding UTF-8: caracteres acentuados corruptos (Ã³ → ó) corregidos en todos los archivos TSX usando escritura directa con Node.js. | — |
| 2026-03-25 | 0.3.2 | Agenda semanal rediseñada: cada día tiene 3 sub-columnas (una por doctor). Clic en columna asigna automáticamente el doctor. Doctores con colores diferenciados (emerald/teal/cyan). Motivos predefinidos (8 categorías + "Otro" libre). Panel lateral con disponibilidad del día. | — |
| 2026-03-25 | 0.4.0 | Agenda vista mensual: grid Lun–Dom por mes, chips de citas con color de doctor, botón `+` por celda, navegación ±1 mes. Toggle Semana/Mes en header. Modelo de cita migrado de índice-semana a fecha real `"YYYY-MM-DD"` (citas persisten al navegar). Modal unificado: desde vista mensual permite elegir doctor + hora libres. | — |
| 2026-03-25 | 0.5.0 | **Persistencia BD completa para Animales e Inventario.** AnimalesPage: formulario multi-paso (Propietario→Mascota→Resumen), foto upload, 6 especies con razas, historial de peso. InventarioPage: formulario 3 pestañas (Documento/Producto/Stock), cálculo IVA/total automático, margen de precio, alertas stock y vencimiento. Backend: `AnimalesModule` + `InventarioModule` con endpoints REST protegidos por JWT. Los datos se guardan en SQLite: `owners`, `pets`, `pet_weights`, `products`, `suppliers`, `stock_movements`. Propietarios deduplicados por RUT/documento. | — |
| 2026-03-25 | 0.6.0 | **Persistencia citas + Auth guard + Tutor search + Renombrado UI.** (1) `AtencionModule`: `GET /api/citas?desde=&hasta=`, `POST /api/citas`, `DELETE /api/citas/:id` — citas vinculadas a `Pet` real; acepta `mascotaId` opcional o crea pet por nombre. (2) `PrivateRoute` en `router.tsx`: redirige a `/login` si no hay `kmcvet_token` — fix de errores 401. (3) Renombrado global "Propietario" → "Tutor" en toda la interfaz (AnimalesPage, AgendaPage). (4) Modal nueva cita rediseñado: búsqueda por RUT del tutor → lista de mascotas registradas → selección o creación inline. (5) Nuevo endpoint `GET /api/animales/buscar-tutor?rut=XXX`. (6) `animales.service.ts`: `mapPet()` devuelve campo `tutor`, métodos `create`/`update` aceptan `dto.tutor` o `dto.propietario` (compatibilidad). | — |
| 2026-03-26 | 0.7.0 | **Modal de detalle de cita + historial por mascota + fix JWT + fix fecha.** (1) `ModalDetalleCita`: clic en cualquier cita (grid semanal o panel lateral) abre modal con doctor, fecha/hora/duración, mascota, tutor y motivo. (2) Historial de atenciones **por mascota** (no por tutor) en el modal — cita seleccionada excluida del listado. (3) Nuevo endpoint `GET /api/citas/historial/:mascotaId`. (4) `mapCita()` actualizado: devuelve `mascotaId` y `propietario` (obtenido del join `mascota.propietario.nombre`). (5) Fix `JWT_EXPIRES_IN`: cambiado de `15m` a `8h` — token expiraba en plena jornada causando 401 en todas las peticiones. (6) Fix fecha hardcodeada: `new Date(2026, 2, 25)` → `new Date()` (corregido en sesión anterior). | — |
| 2026-04-01 | 0.8.0 | **Módulo Ventas completo: folios SII, tipos de documento, RUT cliente, Nota de Crédito, cobros pendientes.** (1) **Sistema de Folios** (`FolioRange` model): rango desde/hasta/actual por tipo (boleta/factura/nota_credito), vencimiento, UI en Configuración → Folios con historial (Van/Quedan). (2) **Boleta PDF mejorada**: HTML A4 con CSS, folio real, tipo doc, IVA referencial desglosado, plantilla de imagen por tipo. (3) **Ventas PENDIENTE/COMPLETADA**: venta sin folio activo queda en estado PENDIENTE; endpoint `PUT /api/ventas/:id/completar` asigna folio retroactivamente. (4) **Tab Pendiente** en VentasPage: listado separado con banner genérico; botón «Reintentar» carga los ítems de vuelta en «Nuevo cobro» (en lugar de reintentar asignación de folio). (5) **Selector tipoDoc**: dropdown boleta/factura en «Nuevo cobro»; campo RUT cliente opcional para boleta, obligatorio para factura; auto-relleno desde `location.state.rutPropietario` cuando viene desde la agenda. (6) **Nota de Crédito** (`nota_credito`): endpoint `POST /api/ventas/:id/nota-credito` crea documento referenciando la venta original (`ventaReferenciaId`), intenta asignar folio NC; botón «NC» por fila en Historial abre `ModalNotaCredito` con motivo obligatorio; filas NC se muestran en rojo en la tabla. (7) **VentasPage Historial mejorado**: badge BOL/FCT/NC + N° folio en columna Fecha; total NC en rojo. (8) **PDF Nota de Crédito**: referencia al documento original en la boleta impresa; RUT cliente incluido si está disponible. (9) Migración `20260402000000_sale_rut_referencia`: `rutCliente TEXT`, `ventaReferenciaId TEXT` en tabla `sales`. | — |
| 2026-04-10 | 1.0.0 | **Módulo Caja + Dashboard Meta Mensual + Personal + Hospital + Plantillas SII.** (1) **CajaPage**: arqueo diario con denominaciones chilenas vigentes (billetes $1K–$20K, monedas $10–$500), medios de pago (efectivo/tarjeta/transferencia), comparación vs ventas del sistema, diferencia cuadrada/descuadrada, historial de cierres, exportar HTML imprimible. (2) **PersonalPage**: CRUD staff con cargos y color, turnos semanales en grilla (Día/Tarde/Noche/Libre) con navegación de semana, asignación por clic en celda. (3) **HospitalPage**: check-in con filtros de especie y búsqueda libre, tarjetas de hospedaje activo, checkout, historial finalizado. (4) **Plantillas SII** en `docs/`: `template-boleta.html` (DTE 39/41), `template-factura.html` (DTE 33), `template-nota-credito.html` (DTE 61) — conformes a Res. Ex. SII N°11/2003 y N°74/2014, con resolución SII, timbre electrónico placeholder, bloque CEDEABLE (factura) y bloque referencia obligatorio (NC). (5) **Dashboard meta mensual**: `GET /api/caja/total-mes` + `GET /api/metas?tipo=mensual` → barra de progreso mensual junto a la meta diaria. (6) **Exportar folios CSV** desde Configuración → Folios. (7) **Sidebar**: nuevos grupos GESTIÓN (Inventario, Caja, Personal) y en CLÍNICA se agrega Hospital. (8) Migraciones: `hospedaje`, `staff_turnos`. | — |
| 2026-04-18 | 1.1.5 | **Configuración Mi Clínica expandida + fixes Hospital modal + bump versión.** (1) **Prisma Tenant**: 9 nuevos campos opcionales: `nombreEmpresa`, `rutEmpresa`, `giroClinica`, `direccionClinica`, `comunaClinica`, `ciudadClinica`, `eslogan`, `resolucionSII`, `dteTipo` (@default "39"). (2) **ConfiguracionPage**: `ClinicaConfig` interface expandida; `SeccionClinica` reescrita en 4 secciones coloreadas (Identidad, Datos tributarios SII, Dirección, Contacto); selector DTE 39/41. (3) **HospitalPage `ModalCheckin`**: fix `r.data` era el array directamente (no `r.data.items`); fix propiedad `tutor` (no `propietario`); pills de filtro por especie dinámicos; búsqueda libre por nombre/raza/tutor; select tipo listbox con `🐶 Max (Labrador) — Juan Pérez`. (4) **animales.service.ts `mapPet`**: agrega `tutorId` y `tutor.id` al objeto retornado. (5) **Versión** `v1.1.2` → `v1.1.5` en `AppLayout.tsx`. (6) `db push` y rebuild completo exitoso. | — |

---

> **Estado actual** (v1.1.5): Fases 0–4 completadas. Sistema funcional con `node apps/api/dist/main.js`.
>
> **Módulos en producción**: Dashboard, Atención (agenda), Animales, Hospital, Ventas, Inventario, Caja, Personal, Configuración.
>
> **Persistencia activa**: Animales, Inventario, Citas, Ventas, Folios, Hospedaje, Staff/Turnos, Caja guardan en SQLite. Los datos sobreviven reinicios del servidor.
>
> **Auth activa**: `PrivateRoute` en router — cualquier acceso sin token JWT redirige a `/login`. Token válido 8h.
>
> **Endpoints disponibles**:
> - `POST /api/auth/login`
> - `GET|POST|PUT|DELETE /api/animales` + `GET /api/animales/buscar-tutor?rut=XXX`
> - `GET|POST|PUT /api/inventario`
> - `GET /api/citas?desde=&hasta=` + `POST /api/citas` + `DELETE /api/citas/:id` + `GET /api/citas/historial/:mascotaId`
> - `GET|POST /api/ventas` + `PUT /api/ventas/:id/completar` + `POST /api/ventas/:id/nota-credito`
> - `GET|PUT /api/configuracion/clinica` + `GET|POST /api/configuracion/tipos-atencion` + `GET|POST /api/configuracion/folios`
> - `GET|POST /api/reserva/doctores|motivos|disponibilidad`
> - `GET|POST /api/hospital` + `PUT /api/hospital/:id/checkout`
> - `GET|POST|PUT|DELETE /api/personal` + `GET|POST /api/personal/turnos` + `DELETE /api/personal/turnos/:id`
> - `GET /api/caja/historial` + `POST /api/caja` + `DELETE /api/caja/:id` + `GET /api/caja/total-mes`
> - `GET|POST|PUT /api/metas`
>
> Todos los endpoints (excepto `POST /api/auth/login` y `/api/reserva/*`) requieren JWT en header `Authorization: Bearer <token>`.
>
> **Próximos pasos sugeridos**: ficha de consulta (diagnóstico, tratamiento) vinculada a cita; historial clínico por mascota; inyección de variables `{{NOMBRE_EMPRESA}}` etc. en plantillas desde el backend al imprimir; envío de boleta por email.
