import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../common/auth.guard";
import { AuthUser } from "../common/auth.types";
import { CurrentUser } from "../common/current-user.decorator";
import { RolesGuard } from "../common/roles.guard";
import { StudentsService } from "./students.service";

@Controller("students")
@UseGuards(AuthGuard, RolesGuard)
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.students.list(user);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.students.get(user, id);
  }
}
