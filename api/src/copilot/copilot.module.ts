import { Module } from '@nestjs/common';
import { TrechoModule } from '../trecho/trecho.module';
import { NormaModule } from '../norma/norma.module';
import { PlantModule } from '../plant/plant.module';
import { CopilotService } from './copilot.service';
import { CopilotController } from './copilot.controller';

@Module({
    imports: [TrechoModule, NormaModule, PlantModule],
    controllers: [CopilotController],
    providers: [CopilotService],
    exports: [CopilotService],
})
export class CopilotModule {}
