import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import jwt from "jsonwebtoken";
import { PrismaService } from "../prisma/prisma.service";
import { TOKEN_COOKIE } from "./auth.types";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    const token = request.cookies?.[TOKEN_COOKIE] ?? bearer;
    if (!token) {
      throw new UnauthorizedException();
    }

    let sub: string;
    try {
      const payload = jwt.verify(token, this.config.getOrThrow<string>("JWT_SECRET"));
      if (typeof payload === "string" || typeof payload.sub !== "string") {
        throw new UnauthorizedException();
      }
      sub = payload.sub;
    } catch {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({ where: { id: sub } });
    if (!user) {
      throw new UnauthorizedException();
    }

    request.user = {
      id: user.id,
      tenantId: user.tenantId,
      campusId: user.campusId,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return true;
  }
}
