import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { InternoKeyGuard } from './interno-key.guard';
import { IngestaoService } from './ingestao.service';
import { IngestaoDto } from './dto/ingestao.dto';

// Rotas chamadas pelo serviço Python (nunca pelo front): sem JWT de usuário,
// autenticadas pelo header `x-internal-key`.
@IsPublic()
@UseGuards(InternoKeyGuard)
@Controller('interno')
export class IngestaoController {
    constructor(private readonly ingestaoService: IngestaoService) {}

    // 200 em vez do 201 padrão: o `notify_api` do ai/store.py só aceita 200.
    @Post('ingestao')
    @HttpCode(200)
    async ingerir(@Body() dto: IngestaoDto) {
        return await this.ingestaoService.ingerir(dto);
    }
}
