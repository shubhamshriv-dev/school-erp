import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("v1");
  app.use(cookieParser());
  app.enableCors({
    origin: ["http://localhost:5173"],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
