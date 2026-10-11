import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  SetMetadata,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { examSchema, marksSubmitSchema } from "@school/shared";
import { AuthGuard } from "../common/auth.guard";
import { AuthUser } from "../common/auth.types";
import { CurrentUser } from "../common/current-user.decorator";
import { ROLES_KEY, RolesGuard } from "../common/roles.guard";
import { parseBody } from "../common/zod";
import { AcademicsService } from "./academics.service";

@Controller("exams")
@UseGuards(AuthGuard, RolesGuard)
export class ExamsController {
  constructor(private readonly academics: AcademicsService) {}

  @Get()
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT])
  list(@CurrentUser() user: AuthUser) {
    return this.academics.list(user);
  }

  @Post()
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN])
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.academics.create(user, parseBody(examSchema, body));
  }

  @Post(":id/publish")
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN])
  publish(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.academics.publish(user, id);
  }

  @Get(":id/marks")
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN, UserRole.TEACHER])
  marks(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Query("sectionId") sectionId?: string,
  ) {
    if (!sectionId) {
      throw new BadRequestException("sectionId is required");
    }
    return this.academics.marks(user, id, sectionId);
  }

  @Put(":id/marks")
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN, UserRole.TEACHER])
  submitMarks(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    return this.academics.submitMarks(user, id, parseBody(marksSubmitSchema, body));
  }
}

@Controller("report-cards")
@UseGuards(AuthGuard, RolesGuard)
@SetMetadata(ROLES_KEY, [UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT])
export class ReportCardsController {
  constructor(private readonly academics: AcademicsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.academics.reportList(user);
  }

  @Get(":studentId")
  card(
    @CurrentUser() user: AuthUser,
    @Param("studentId") studentId: string,
    @Query("examId") examId?: string,
  ) {
    return this.academics.reportCard(user, studentId, examId);
  }
}
