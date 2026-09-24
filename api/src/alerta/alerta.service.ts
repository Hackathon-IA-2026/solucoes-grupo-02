import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { BaseService } from '../base.service';
import { AlertaEntity } from './entities/alerta.entity';
import { CreateAlertaDto } from './dto/create-alerta.dto';

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function formatAt(date: Date): string {
    const agora = new Date();
    const hora = `${pad(date.getHours())}h${pad(date.getMinutes())}`;
    const mesmoDia = date.toDateString() === agora.toDateString();
    const ontem = new Date(agora);
    ontem.setDate(agora.getDate() - 1);
    if (mesmoDia) return `hoje, ${hora}`;
    if (date.toDateString() === ontem.toDateString()) return `ontem, ${hora}`;
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}, ${hora}`;
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
