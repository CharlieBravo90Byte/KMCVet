# KMCVet — Documento de Proyecto

> Versión: 0.7.0 — Inicio: 24 de marzo de 2026  
> Estado: Desarrollo activo (Fase 0 completada + Fase 1 y 2 avanzadas)

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Objetivos Clave](#2-objetivos-clave)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Arquitectura del Sistema](#4-arquitectura-del-sistema)
5. [Módulos del Sistema](#5-módulos-del-sistema)
6. [Modelo de Datos Inicial](#6-modelo-de-datos-inicial)
7. [Estrategia Offline-First](#7-estrategia-offline-first)
8. [Estrategia White-Label](#8-estrategia-white-label)
9. [Estructura del Repositorio](#9-estructura-del-repositorio)
10. [Fases del Proyecto (Roadmap)](#10-fases-del-proyecto-roadmap)
11. [Decisiones de Diseño](#11-decisiones-de-diseño)
12. [Registro de Cambios](#12-registro-de-cambios)

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

## 5. Módulos del Sistema

### 5.1 Módulo: Atención al Cliente

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

### 5.2 Módulo: Inventario

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

### 5.3 Módulo: Usuarios y Roles

| Rol | Permisos |
|-----|---------|
| **Admin** | Acceso total: configuración, reportes, usuarios, white-label |
| **Veterinario** | Agenda propia, fichas, diagnósticos, recetas |
| **Recepcionista** | Agenda general, ficha propietario/mascota, no diagnóstico |
| **Inventarista** | Módulo inventario completo, sin atención |

### 5.4 Módulo: Configuración (White-Label)

- Nombre de la veterinaria
- Logo (imagen)
- Colores primario y secundario (CSS custom properties)
- Información de contacto (teléfono, dirección, redes)
- Configuración de moneda y zona horaria
- Módulos habilitados/deshabilitados por instancia

---

## 6. Modelo de Datos Inicial

> Nota: Definición simplificada. El esquema Prisma completo se desarrollará en la fase de implementación.

```
Tenant (Veterinaria)
├── id, nombre, logo_url, config_json, slug
├── → Usuarios (1:N)
├── → Mascotas (1:N)
└── → Productos (1:N)

Usuario
├── id, tenant_id, nombre, email, password_hash, rol
└── → Citas (1:N como veterinario)

Propietario
├── id, tenant_id, nombre, documento, telefono, email, direccion
└── → Mascotas (1:N)

Mascota
├── id, tenant_id, propietario_id, nombre, especie, raza
├── fecha_nacimiento, sexo, color, microchip, foto_url
└── → Consultas (1:N)

Cita
├── id, tenant_id, mascota_id, veterinario_id
├── fecha_hora, duracion_min, motivo, estado
└── → Consulta (1:1)

Consulta
├── id, tenant_id, cita_id, veterinario_id, mascota_id
├── peso_kg, temperatura, diagnostico, tratamiento, notas
└── → ItemsReceta (1:N)

ItemReceta
├── id, consulta_id, producto_id, cantidad, indicacion
└── → Producto

Producto
├── id, tenant_id, nombre, codigo, categoria, unidad
├── stock_actual, stock_minimo, precio_costo, precio_venta
└── → MovimientosStock (1:N)

MovimientoStock
├── id, producto_id, tenant_id, tipo (entrada|salida|ajuste)
├── cantidad, referencia_id (consulta o compra), notas
└── fecha, usuario_id

Proveedor
├── id, tenant_id, nombre, contacto, telefono, email
└── → OrdenesCompra (1:N)

OrdenCompra
├── id, tenant_id, proveedor_id, fecha, numero_factura, estado
└── → ItemsOrden (1:N)

ItemOrden
├── id, orden_id, producto_id, cantidad, precio_unitario
```

---

## 7. Estrategia Offline-First

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

## 8. Estrategia White-Label

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

## 9. Estructura del Repositorio

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

## 10. Fases del Proyecto (Roadmap)

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

### Fase 2 — Core: Inventario
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

### Fase 3 — White-Label y Multi-Tenant
- [ ] Panel de configuración por veterinaria
- [ ] Carga dinámica de logo y colores
- [ ] Sistema de dominios personalizados
- [ ] Panel de superadmin (gestión de tenants)
- [ ] Onboarding de nueva veterinaria

### Fase 4 — Mejoras y Pulido
- [ ] Aplicación móvil (Capacitor sobre la PWA)
- [ ] Notificaciones push (recordatorio de citas)
- [ ] Estadísticas y reportes avanzados
- [ ] Exportación a PDF (fichas, recetas, reportes)
- [ ] Backup automático por tenant
- [ ] Dark mode

### Fase 5 — Comercialización
- [ ] Landing page de producto
- [ ] Proceso de contratación/suscripción
- [ ] Documentación para administradores
- [ ] Soporte multi-idioma (i18n)

---

## 11. Decisiones de Diseño

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

## 12. Registro de Cambios

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

---

> **Estado actual**: Fase 0 completada + Fase 1 base completa + Fase 2 avanzada (v0.7.0). Sistema funcional con `node apps/api/dist/main.js`.
>
> **Persistencia activa**: Animales, Inventario y Citas guardan en SQLite. Los datos sobreviven reinicios del servidor.
>
> **Auth activa**: `PrivateRoute` en router — cualquier acceso sin token JWT redirige a `/login`.
>
> **Endpoints disponibles**:
> - `POST /api/auth/login`
> - `GET|POST|PUT|DELETE /api/animales` + `GET /api/animales/buscar-tutor?rut=XXX`
> - `GET|POST|PUT /api/inventario`
> - `GET /api/citas?desde=&hasta=` + `POST /api/citas` + `DELETE /api/citas/:id`
>
> Todos los endpoints (excepto login) requieren JWT en header `Authorization: Bearer <token>`.
>
> **Próximo paso**: ficha de consulta (diagnóstico, tratamiento) vinculada a cita; historial clínico por mascota.
