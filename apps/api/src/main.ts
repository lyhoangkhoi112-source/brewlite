declare const module: any;

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ApiExceptionFilter } from './response/api-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Bật CORS để Next.js gọi API
  app.useGlobalPipes(new ValidationPipe({ whitelist: true })); // Lọc dữ liệu DTO

  const port = process.env.PORT || 3001;
  await app.listen(port);

  app.useGlobalFilters(new ApiExceptionFilter());
}
void bootstrap().catch((error: unknown) => {
  console.error('Failed to start API', error);
  process.exitCode = 1;
});