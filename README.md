# KMCVet

Sistema de gestión integral para veterinarias — control de atención al cliente e inventario.

> **v0.7.0** — Build: `node scripts/build-all.js` → `node apps/api/dist/main.js` → http://localhost:3000

## Estructura

```
kmcvet/
├── apps/
│   ├── web/     # React 19 PWA (Vite + Tailwind)
│   └── api/     # NestJS REST API + Prisma + SQLite (embebido)
├── packages/
│   └── shared/  # Tipos y schemas Zod compartidos
├── infra/       # docker-compose (opcional para producción avanzada)
└── docs/        # Documentación del proyecto (PROJECT.md)
```

## Requisitos previos

- Node.js >= 22
- pnpm >= 10

> No se necesita Docker, PostgreSQL, Redis ni MinIO. Todo está embebido para facilitar el desarrollo local y despliegue simple.
> La base de datos es SQLite (archivo local `apps/api/prisma/kmcvet.db`).

## Inicio rápido

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
copy infra\.env.example apps\api\.env   # Windows
# cp infra/.env.example apps/api/.env  # macOS/Linux

# 3. Crear la base de datos y ejecutar migraciones
pnpm --filter @kmcvet/api db:generate
pnpm --filter @kmcvet/api db:migrate:dev

# 4. (Opcional) Cargar datos de prueba
pnpm --filter @kmcvet/api db:seed

# 5. Build y ejecutar
node scripts/build-all.js
cd apps/api && node dist/main.js
```

## Apps disponibles

| App | URL local | Descripción |
|-----|-----------|-------------|
| Web + API | http://localhost:3000 | Frontend React servido desde NestJS |
| API REST | http://localhost:3000/api | Endpoints REST |
| Prisma Studio | http://localhost:5555 | GUI de BD (solo dev: `pnpm db:studio`) |

## Credenciales demo (seed)

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin@demo.kmcvet.com` | `Admin1234!` | Admin |
| `vet@demo.kmcvet.com` | `Vet1234!` | Veterinario |

## Endpoints API

Todos requieren `Authorization: Bearer <token>` excepto `/api/auth/login`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Obtener JWT |
| `GET\|POST\|PUT\|DELETE` | `/api/animales` | CRUD mascotas + tutores |
| `GET` | `/api/animales/buscar-tutor?rut=XXX` | Buscar tutor por RUT + sus mascotas |
| `GET\|POST\|PUT` | `/api/inventario` | CRUD inventario / productos |
| `GET` | `/api/citas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` | Citas por rango de fechas |
| `POST` | `/api/citas` | Crear cita |
| `DELETE` | `/api/citas/:id` | Eliminar cita |
| `GET` | `/api/citas/historial/:mascotaId` | Historial de atenciones por mascota |

## Módulos implementados

- **Login** — JWT multi-tenant (token 8h), guard `PrivateRoute` protege todas las rutas
- **Dashboard** — Stats generales y acciones rápidas
- **Animales** — Registro de mascotas con ficha del tutor (RUT, teléfono, email), búsqueda y filtro por especie
- **Inventario** — Productos, proveedores, control de stock, alertas de vencimiento
- **Agenda** — Vista semanal y mensual, 3 doctores, slots 15/30/60 min, búsqueda de tutor por RUT al crear cita; clic en cita muestra modal de detalle con historial de atenciones de la mascota

## Más información

Ver [docs/PROJECT.md](docs/PROJECT.md) para arquitectura, modelo de datos, decisiones de diseño y roadmap completo.
