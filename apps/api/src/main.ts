import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

const MIN_JWT_SECRET_LEN = 32;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // ---- Validación temprana de secretos críticos -----------------------------
  const jwtSecret = config.get<string>('JWT_SECRET');
  if (!jwtSecret || jwtSecret.length < MIN_JWT_SECRET_LEN) {
    logger.error(`JWT_SECRET debe existir y tener al menos ${MIN_JWT_SECRET_LEN} caracteres`);
    process.exit(1);
  }

  // ---- Detrás de un reverse-proxy (nginx/caddy/traefik) ---------------------
  // Necesario para que `req.secure`, `req.ip` y la cookie `secure: true` funcionen.
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  // ---- Security headers (helmet) -------------------------------------------
  // Desactivamos CSP/COEP/COOP a nivel API porque la API solo emite JSON;
  // las políticas de la SPA las maneja nginx en `apps/web/nginx.conf`.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  app.enableCors({
    origin: config.get<string>('API_CORS_ORIGIN', 'http://localhost:8081').split(','),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = config.get<number>('API_PORT', 3000);
  await app.listen(port, '0.0.0.0');

  logger.log(`API listening on http://0.0.0.0:${port}/api`);
}

bootstrap();
