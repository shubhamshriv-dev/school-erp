import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { SetMetadata } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { enrolSchema, enquirySchema, enquiryStatusSchema } from "@school/shared";
import { AuthGuard } from "../common/auth.guard";
import { AuthUser } from "../common/auth.types";
import { CurrentUser } from "../common/current-user.decorator";
import { ROLES_KEY, RolesGuard } from "../common/roles.guard";
import { parseBody } from "../common/zod";
import { AdmissionsService } from "./admissions.service";

@Controller("admissions")
@UseGuards(AuthGuard, RolesGuard)
@SetMetadata(ROLES_KEY, [UserRole.ADMIN])
export class AdmissionsController {
  constructor(private readonly admissions: AdmissionsService) {}

  @Get("options")
  options(@CurrentUser() user: AuthUser) {
    return this.admissions.options(user);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.admissions.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.admissions.create(user, parseBody(enquirySchema, body));
  }

  @Post(":id/status")
  status(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    return this.admissions.updateStatus(user, id, parseBody(enquiryStatusSchema, body));
  }

  @Post(":id/enrol")
  enrol(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    return this.admissions.enrol(user, id, parseBody(enrolSchema, body));
  }
}
