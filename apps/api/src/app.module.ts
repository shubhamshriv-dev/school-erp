import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdmissionsModule } from "./admissions/admissions.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { AuthModule } from "./auth/auth.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { FeesModule } from "./fees/fees.module";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { SetupModule } from "./setup/setup.module";
import { StudentsModule } from "./students/students.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SetupModule,
    StudentsModule,
    AdmissionsModule,
    AttendanceModule,
    FeesModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
