import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AcademicsModule } from "./academics/academics.module";
import { AdmissionsModule } from "./admissions/admissions.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { AuthModule } from "./auth/auth.module";
import { CertificatesModule } from "./certificates/certificates.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { FeesModule } from "./fees/fees.module";
import { HealthController } from "./health.controller";
import { NoticesModule } from "./notices/notices.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SetupModule } from "./setup/setup.module";
import { StudentsModule } from "./students/students.module";
import { TimetableModule } from "./timetable/timetable.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SetupModule,
    StudentsModule,
    AdmissionsModule,
    AcademicsModule,
    NoticesModule,
    CertificatesModule,
    TimetableModule,
    AttendanceModule,
    FeesModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
