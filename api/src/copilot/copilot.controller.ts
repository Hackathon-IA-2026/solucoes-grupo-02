import { Body, Controller, Post } from '@nestjs/common';
import { CopilotService } from './copilot.service';
import { AskDto } from './dto/ask.dto';

@Controller('copilot')
export class CopilotController {
    constructor(private readonly copilotService: CopilotService) {}

    @Post('ask')
    async ask(@Body() dto: AskDto) {
        return await this.copilotService.ask(dto.question);
    }
}
