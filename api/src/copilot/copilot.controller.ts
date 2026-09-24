import { Body, Controller, Post, Request } from '@nestjs/common';
import { UserPayload } from '../auth/types/user.payload.type';
import { CopilotService } from './copilot.service';
import { AskDto } from './dto/ask.dto';

@Controller('copilot')
export class CopilotController {
    constructor(private readonly copilotService: CopilotService) {}

    @Post('ask')
    async ask(@Request() req: { user: UserPayload }, @Body() dto: AskDto) {
        return await this.copilotService.ask(dto.question, req.user.companyId);
    }
}
