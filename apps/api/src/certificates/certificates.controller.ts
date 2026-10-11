import { Body, Controller, Get, Param, Post, SetMetadata, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { certificateSchema } from "@school/shared";
import { AuthGuard } from "../common/auth.guard";
import { AuthUser } from "../common/auth.types";
import { CurrentUser } from "../common/current-user.decorator";
import { ROLES_KEY, RolesGuard } from "../common/roles.guard";
import { parseBody } from "../common/zod";
import { CertificatesService } from "./certificates.service";

@Controller("certificates")
@UseGuards(AuthGuard, RolesGuard)
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get()
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT])
  list(@CurrentUser() user: AuthUser) {
    return this.certificates.list(user);
  }

  @Get(":id")
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT])
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.certificates.get(user, id);
  }

  @Post()
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN])
  issue(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.certificates.issue(user, parseBody(certificateSchema, body));
  }
}
