import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { InternoKeyGuard } from './interno-key.guard';
import { IngestaoService } from './ingestao.service';
import { IngestaoDto } from './dto/ingestao.dto';

@IsPublic()
@UseGuards(InternoKeyGuard)
@Controller('interno')
export class IngestaoController {
    constructor(private readonly ingestaoService: IngestaoService) {}

    @Post('ingestao')
    @HttpCode(200)
    async ingerir(@Body() dto: IngestaoDto) {
        return await this.ingestaoService.ingerir(dto);
    }
}
