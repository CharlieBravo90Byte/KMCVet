// ============================================================
// KMCVet API — Entry Point
// ============================================================
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ── Seguridad ──────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  );

  // ── CORS (solo en desarrollo; en producción mismo origen) ──
  if (process.env.NODE_ENV !== 'production') {
    const origins = process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:5173'];
    app.enableCors({ origin: origins, credentials: true });
  }

  // ── Prefijo global de la API ───────────────────────────────
  const prefix = process.env.API_PREFIX ?? 'api';
  app.setGlobalPrefix(prefix);

  // ── Validación global ──────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── Swagger / OpenAPI ──────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('KMCVet API')
    .setDescription('REST API del sistema de gestión veterinaria KMCVet')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(prefix, app, document);

  // ── Archivos de subida locales (fotos, attachments) ────────
  const uploadsDir = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // ── Frontend estático (solo si el build existe) ────────────
  // `pnpm build` compila React → apps/api/public/
  const publicDir = join(__dirname, '..', 'public');
  if (existsSync(publicDir)) {
    app.useStaticAssets(publicDir);

    // SPA fallback: rutas no-API sirven index.html para React Router
    const indexHtml = join(publicDir, 'index.html');
    if (existsSync(indexHtml)) {
      app.use((req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
        if (!req.path.startsWith(`/${prefix}`) && !req.path.startsWith('/uploads')) {
          res.sendFile(indexHtml);
        } else {
          next();
        }
      });
    }
  }

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`🚀 API:      http://localhost:${port}/${prefix}`);
    console.log(`📚 Swagger:  http://localhost:${port}/${prefix}`);
    console.log(`🌐 Web dev:  http://localhost:5173  (Vite dev server)`);
  } else {
    console.log(`✅ KMCVet corriendo en:  http://localhost:${port}`);
    console.log(`📚 API Docs:             http://localhost:${port}/${prefix}`);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Error al iniciar KMCVet:', error);
  process.exit(1);
});
