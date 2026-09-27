import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AlertEngineService } from './alert-engine.service';

const HORA = 60 * 60 * 1000;

@Injectable()
export class AlertDigestService {
    constructor(private readonly alertEngine: AlertEngineService) {}

    @Cron('0 8 * * *', { timeZone: 'America/Sao_Paulo' })
    async resumoDiario() {
        await this.alertEngine.enviarResumo('Resumo diário', new Date(Date.now() - 24 * HORA));
    }

    @Cron('0 8 * * 1', { timeZone: 'America/Sao_Paulo' })
    async resumoSemanal() {
        await this.alertEngine.enviarResumo('Resumo semanal', new Date(Date.now() - 7 * 24 * HORA));
    }
}
