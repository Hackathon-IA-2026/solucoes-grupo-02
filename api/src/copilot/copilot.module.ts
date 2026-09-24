import { Module } from '@nestjs/common';
import { TrechoModule } from '../trecho/trecho.module';
import { NormaModule } from '../norma/norma.module';
import { CopilotService } from './copilot.service';
import { CopilotController } from './copilot.controller';

@Module({
    imports: [TrechoModule, NormaModule],
    controllers: [CopilotController],
    providers: [CopilotService],
    exports: [CopilotService],
})
export class CopilotModule {}
