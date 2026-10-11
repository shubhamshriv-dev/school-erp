import { Module } from "@nestjs/common";
import { AcademicsService } from "./academics.service";
import { ExamsController, ReportCardsController } from "./academics.controller";

@Module({
  controllers: [ExamsController, ReportCardsController],
  providers: [AcademicsService],
})
export class AcademicsModule {}
