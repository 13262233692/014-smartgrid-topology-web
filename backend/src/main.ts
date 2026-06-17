import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`[SmartGrid Topology Backend] Server running on http://localhost:${port}`);
}
bootstrap();
