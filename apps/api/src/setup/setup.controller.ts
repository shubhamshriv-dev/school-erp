import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { SetMetadata } from "@nestjs/common";
import { AuthGuard } from "../common/auth.guard";
import { AuthUser } from "../common/auth.types";
import { CurrentUser } from "../common/current-user.decorator";
import { ROLES_KEY, RolesGuard } from "../common/roles.guard";
import { SetupService } from "./setup.service";

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  @Get("setup")
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN])
  overview(@CurrentUser() user: AuthUser) {
    return this.setup.overview(user);
  }

  @Get("sections")
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN, UserRole.TEACHER])
  sections(@CurrentUser() user: AuthUser) {
    return this.setup.sections(user);
  }
}
