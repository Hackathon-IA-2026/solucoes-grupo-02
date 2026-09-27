import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Request } from '@nestjs/common';
import { UserPayload } from '../auth/types/user.payload.type';
import { AlertaService, toAlertResponse } from './alerta.service';
import { AlertEngineService } from './alert-engine.service';
import { CreateAlertaDto } from './dto/create-alerta.dto';

@Controller('alerts')
export class AlertaController {
    constructor(
        private readonly alertaService: AlertaService,
        private readonly alertEngineService: AlertEngineService,
    ) {}

    @Post('check')
    async check(@Request() req: { user: UserPayload }) {
        const criados = await this.alertEngineService.run(req.user.companyId);
        return criados.map(toAlertResponse);
    }

    @Post()
    async create(@Request() req: { user: UserPayload }, @Body() dto: CreateAlertaDto) {
        const alerta = await this.alertaService.create(req.user.companyId, dto);
        return toAlertResponse(alerta);
    }

    @Get()
    async list(@Request() req: { user: UserPayload }) {
        const alertas = await this.alertaService.list(req.user.companyId);
        return alertas.map(toAlertResponse);
    }

    @Patch(':id/read')
    async markAsRead(@Request() req: { user: UserPayload }, @Param('id', ParseUUIDPipe) id: string) {
        const alerta = await this.alertaService.markAsRead(req.user.companyId, id);
        return toAlertResponse(alerta);
    }

    @Delete(':id')
    async remove(@Request() req: { user: UserPayload }, @Param('id', ParseUUIDPipe) id: string) {
        await this.alertaService.remove(req.user.companyId, id);
    }
}
