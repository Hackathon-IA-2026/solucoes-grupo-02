import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { AlertaService, toAlertResponse } from './alerta.service';
import { CreateAlertaDto } from './dto/create-alerta.dto';

@Controller('alerts')
export class AlertaController {
    constructor(private readonly alertaService: AlertaService) {}

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
