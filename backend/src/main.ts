import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { mkdirSync } from 'fs';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const prefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(prefix);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({
    origin: (origin, callback) => {
      const allowed = (process.env.APP_URL || 'http://localhost:3000')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      // Non-browser clients (curl, server-side) send no Origin
      if (!origin || allowed.includes(origin) || allowed.includes('*')) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const upload = process.env.UPLOAD_DIR || './uploads';
  mkdirSync(join(upload, 'evidence'), { recursive: true });
  mkdirSync(join(upload, 'reports'), { recursive: true });

  const swagger = new DocumentBuilder()
    .setTitle('RedOps Manager API')
    .setDescription('Enterprise platform for authorized Penetration Testing and Red Team operations.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger), {
    useGlobalPrefix: false,
  });

  const port = Number(process.env.API_PORT || 4000);
  const host = process.env.API_HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`RedOps API http://${host}:${port}/${prefix}`);
  console.log(`Swagger     http://${host}:${port}/docs`);
}

bootstrap();
