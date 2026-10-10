import "reflect-metadata";
import { existsSync } from "fs";
import { join } from "path";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import express, { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix("v1");
  app.use(cookieParser());
  app.set("trust proxy", 1);
  app.enableCors({
    origin: (process.env.WEB_ORIGIN ?? "http://localhost:5173").split(","),
    credentials: true,
  });

  const webDist = join(__dirname, "..", "..", "web", "dist");
  if (existsSync(webDist)) {
    app.use(express.static(webDist));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET" || req.path.startsWith("/v1")) {
        next();
        return;
      }
      res.sendFile(join(webDist, "index.html"));
    });
  }

  await app.listen(process.env.PORT ?? 3001, "0.0.0.0");
}

bootstrap();
