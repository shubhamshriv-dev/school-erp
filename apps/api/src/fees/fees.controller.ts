import { Body, Controller, Get, Headers, Param, Post, UseGuards } from "@nestjs/common";
import { SetMetadata } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { paymentSchema } from "@school/shared";
import { AuthGuard } from "../common/auth.guard";
import { AuthUser } from "../common/auth.types";
import { CurrentUser } from "../common/current-user.decorator";
import { ROLES_KEY, RolesGuard } from "../common/roles.guard";
import { parseBody } from "../common/zod";
import { FeesService } from "./fees.service";

@Controller("fees")
@UseGuards(AuthGuard, RolesGuard)
export class FeesController {
  constructor(private readonly fees: FeesService) {}

  @Get("invoices")
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN, UserRole.PARENT])
  list(@CurrentUser() user: AuthUser) {
    return this.fees.list(user);
  }

  @Post("invoices/:id/payments")
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN])
  pay(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.fees.recordPayment(user, id, parseBody(paymentSchema, body), idempotencyKey);
  }
}
