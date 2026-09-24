import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { AlertaService, toAlertResponse } from './alerta.service';
import { AlertEngineService } from './alert-engine.service';
import { CreateAlertaDto } from './dto/create-alerta.dto';

@Controller('alerts')
export class AlertaController {
    constructor(
        private readonly alertaService: AlertaService,
        private readonly alertEngineService: AlertEngineService,
    ) {}

    // Cruza `limites` x `configuracoes` de novo e cria os alertas que ainda não
    // existem. O front chama isso logo depois de salvar a usina (PUT /plants/me)
    // pra dar a sensação de "notifica automaticamente" descrita no pitch —
    // tecnicamente são duas chamadas em sequência, não uma transação única.
    @Post('check')
    async check() {
        const criados = await this.alertEngineService.run();
        return criados.map(toAlertResponse);
    }

    @Post()
    async create(@Body() dto: CreateAlertaDto) {
        const alerta = await this.alertaService.create(dto);
        return toAlertResponse(alerta);
    }

    @Get()
    async list() {
        const alertas = await this.alertaService.list();
        return alertas.map(toAlertResponse);
    }

    @Patch(':id/read')
    async markAsRead(@Param('id', ParseUUIDPipe) id: string) {
        const alerta = await this.alertaService.markAsRead(id);
        return toAlertResponse(alerta);
    }

    @Delete(':id')
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        await this.alertaService.remove(id);
    }
}
