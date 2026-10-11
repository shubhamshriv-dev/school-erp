import { Body, Controller, Get, Post, SetMetadata, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { noticeSchema } from "@school/shared";
import { AuthGuard } from "../common/auth.guard";
import { AuthUser } from "../common/auth.types";
import { CurrentUser } from "../common/current-user.decorator";
import { ROLES_KEY, RolesGuard } from "../common/roles.guard";
import { parseBody } from "../common/zod";
import { NoticesService } from "./notices.service";

@Controller("notices")
@UseGuards(AuthGuard, RolesGuard)
export class NoticesController {
  constructor(private readonly notices: NoticesService) {}

  @Get()
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT])
  list(@CurrentUser() user: AuthUser) {
    return this.notices.list(user);
  }

  @Post()
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN])
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.notices.create(user, parseBody(noticeSchema, body));
  }
}
