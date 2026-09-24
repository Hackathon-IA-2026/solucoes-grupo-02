import { Injectable } from '@nestjs/common';
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

    async create(dto: CreateAlertaDto): Promise<AlertaEntity> {
        return await this.persist(dto);
    }

    async list(): Promise<AlertaEntity[]> {
        return await this.findAllInstances({ order: { createdAt: 'DESC' } });
    }

    async listSince(desde: Date): Promise<AlertaEntity[]> {
        return await this.findAllInstances({ where: { createdAt: MoreThanOrEqual(desde) }, order: { createdAt: 'DESC' } });
    }

    async existsUnreadForLimite(limiteId: string): Promise<boolean> {
        const count = await this.repository.count({ where: { limiteId, lido: false } });
        return count > 0;
    }

    async markAsRead(id: string): Promise<AlertaEntity> {
        return await this.updateInstance(id, { lido: true });
    }

    async remove(id: string): Promise<void> {
        await this.deleteInstanceById(id);
    }
}
