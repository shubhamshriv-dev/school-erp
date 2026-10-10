import { Body, Controller, Get, Put, Query, UseGuards } from "@nestjs/common";
import { SetMetadata, BadRequestException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { attendanceSubmitSchema } from "@school/shared";
import { AuthGuard } from "../common/auth.guard";
import { AuthUser } from "../common/auth.types";
import { localDate } from "../common/dates";
import { CurrentUser } from "../common/current-user.decorator";
import { ROLES_KEY, RolesGuard } from "../common/roles.guard";
import { parseBody } from "../common/zod";
import { AttendanceService } from "./attendance.service";

@Controller("attendance")
@UseGuards(AuthGuard, RolesGuard)
@SetMetadata(ROLES_KEY, [UserRole.ADMIN, UserRole.TEACHER])
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get("register")
  register(
    @CurrentUser() user: AuthUser,
    @Query("sectionId") sectionId?: string,
    @Query("date") date?: string,
  ) {
    if (!sectionId) {
      throw new BadRequestException("sectionId is required");
    }
    const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : localDate();
    return this.attendance.register(user, sectionId, day);
  }

  @Put("register")
  submit(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.attendance.submit(user, parseBody(attendanceSubmitSchema, body));
  }
}
