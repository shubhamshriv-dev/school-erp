import { Body, Controller, Get, Post, Res, UseGuards } from "@nestjs/common";
import { loginSchema } from "@school/shared";
import { Response } from "express";
import { AuthGuard } from "../common/auth.guard";
import { TOKEN_COOKIE, AuthUser } from "../common/auth.types";
import { CurrentUser } from "../common/current-user.decorator";
import { parseBody } from "../common/zod";
import { AuthService } from "./auth.service";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: false,
  path: "/",
  maxAge: 12 * 60 * 60 * 1000,
};

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const input = parseBody(loginSchema, body);
    const result = await this.auth.login(input.email, input.password);
    response.cookie(TOKEN_COOKIE, result.token, cookieOptions);
    return { user: result.user };
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(TOKEN_COOKIE, { path: "/" });
    return { ok: true };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
