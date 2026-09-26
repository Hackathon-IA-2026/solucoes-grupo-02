import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { BaseService } from '../base.service';
import { AlertaEntity } from './entities/alerta.entity';
import { CreateAlertaDto } from './dto/create-alerta.dto';

// Horário de Brasília, independente do fuso do servidor (no deploy os containers rodam em UTC).
const EM_BRASILIA = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

function emBrasilia(date: Date) {
    const p = Object.fromEntries(EM_BRASILIA.formatToParts(date).map((x) => [x.type, x.value]));
    return { dia: `${p.year}-${p.month}-${p.day}`, ddmm: `${p.day}/${p.month}`, hora: `${p.hour}h${p.minute}` };
}

export function formatAt(date: Date, agora = new Date()): string {
    const d = emBrasilia(date);
    if (d.dia === emBrasilia(agora).dia) return `hoje, ${d.hora}`;
    if (d.dia === emBrasilia(new Date(agora.getTime() - 24 * 60 * 60 * 1000)).dia) return `ontem, ${d.hora}`;
    return `${d.ddmm}, ${d.hora}`;
}

// Molda a entidade pro formato que o front (AlertsPage) já consome.
export function toAlertResponse(alerta: AlertaEntity) {
    return {
        id: alerta.id,
        severity: alerta.severidade,
        title: alerta.titulo,
        message: alerta.mensagem,
        at: formatAt(alerta.createdAt),
        lido: alerta.lido,
        tipo: alerta.tipo,
        normId: alerta.normaId,
    };
}

@Injectable()
export class AlertaService extends BaseService<AlertaEntity> {
    constructor(
        @InjectRepository(AlertaEntity)
        alertaRepository: Repository<AlertaEntity>,
    ) {
        super(alertaRepository);
    }

    // Todo alerta pertence a uma empresa; as leituras abaixo nunca cruzam empresas.
    async create(companyId: string, dto: CreateAlertaDto): Promise<AlertaEntity> {
        return await this.persist({ ...dto, companyId });
    }

    async list(companyId: string): Promise<AlertaEntity[]> {
        return await this.findAllInstances({ where: { companyId }, order: { createdAt: 'DESC' } });
    }

    async listSince(companyId: string, desde: Date): Promise<AlertaEntity[]> {
        return await this.findAllInstances({ where: { companyId, createdAt: MoreThanOrEqual(desde) }, order: { createdAt: 'DESC' } });
    }

    async existsUnreadForLimite(companyId: string, limiteId: string): Promise<boolean> {
        return await this.repository.existsBy({ companyId, limiteId, lido: false });
    }

    async markAsRead(companyId: string, id: string): Promise<AlertaEntity> {
        const alerta = await this.findInCompanyOrFail(companyId, id);
        return await this.updateInstance(alerta.id, { lido: true });
    }

    async remove(companyId: string, id: string): Promise<void> {
        await this.repository.remove(await this.findInCompanyOrFail(companyId, id));
    }

    private async findInCompanyOrFail(companyId: string, id: string): Promise<AlertaEntity> {
        const alerta = await this.repository.findOneBy({ id, companyId });
        if (!alerta) throw new NotFoundException('Alerta não encontrado.');
        return alerta;
    }
}
