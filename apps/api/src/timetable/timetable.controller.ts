import { Body, Controller, Get, Put, Query, SetMetadata, UseGuards, BadRequestException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { timetableSchema } from "@school/shared";
import { AuthGuard } from "../common/auth.guard";
import { AuthUser } from "../common/auth.types";
import { CurrentUser } from "../common/current-user.decorator";
import { ROLES_KEY, RolesGuard } from "../common/roles.guard";
import { parseBody } from "../common/zod";
import { TimetableService } from "./timetable.service";

@Controller("timetable")
@UseGuards(AuthGuard, RolesGuard)
export class TimetableController {
  constructor(private readonly timetable: TimetableService) {}

  @Get("sections")
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT])
  sections(@CurrentUser() user: AuthUser) {
    return this.timetable.sections(user);
  }

  @Get()
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT])
  get(@CurrentUser() user: AuthUser, @Query("sectionId") sectionId?: string) {
    if (!sectionId) {
      throw new BadRequestException("sectionId is required");
    }
    return this.timetable.get(user, sectionId);
  }

  @Put()
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN])
  save(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.timetable.save(user, parseBody(timetableSchema, body));
  }
}
