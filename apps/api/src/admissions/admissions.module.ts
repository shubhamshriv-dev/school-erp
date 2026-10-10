import { Module } from "@nestjs/common";
import { FeesModule } from "../fees/fees.module";
import { StudentsModule } from "../students/students.module";
import { AdmissionsController } from "./admissions.controller";
import { AdmissionsService } from "./admissions.service";

@Module({
  imports: [StudentsModule, FeesModule],
  controllers: [AdmissionsController],
  providers: [AdmissionsService],
})
export class AdmissionsModule {}