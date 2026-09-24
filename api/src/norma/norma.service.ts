import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../base.service';
import { NormaEntity, NormaSource } from './entities/norma.entity';
import { CreateNormaDto } from './dto/create-norma.dto';
import { UpdateNormaDto } from './dto/update-norma.dto';

const SOURCE_LABEL: Record<NormaSource, string> = {
    aneel: 'ANEEL',
    ccee: 'CCEE',
    dou: 'DOU',
};

function formatDate(value?: string): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Molda a entidade pro formato que o front (Dashboard/Resumos) já consome.
export function toNormResponse(norma: NormaEntity) {
    return {
        id: norma.id,
        code: norma.code ?? [norma.tipo, norma.numero].filter(Boolean).join(' '),
        source: norma.source,
        sourceLabel: SOURCE_LABEL[norma.source],
        impact: norma.impact,
        date: formatDate(norma.publishedAt),
        title: norma.title,
        lead: norma.lead ?? '',
        deadline: norma.deadline ?? '',
        changes: norma.changes ?? [],
        why: norma.why ?? '',
        url: norma.url,
    };
}

@Injectable()
export class NormaService extends BaseService<NormaEntity> {
    constructor(
        @InjectRepository(NormaEntity)
        normaRepository: Repository<NormaEntity>,
    ) {
        super(normaRepository);
    }

    async create(dto: CreateNormaDto): Promise<NormaEntity> {
        return await this.persist(dto);
    }

    async list(source?: NormaSource): Promise<NormaEntity[]> {
        return await this.findAllInstances({
            where: source ? { source } : undefined,
            order: { publishedAt: 'DESC' },
        });
    }

    async getById(id: string): Promise<NormaEntity> {
        return await this.findInstanceByIdOrFail(id);
    }

    async update(id: string, dto: UpdateNormaDto): Promise<NormaEntity> {
        return await this.updateInstance(id, dto);
    }

    async remove(id: string): Promise<void> {
        await this.deleteInstanceById(id);
    }
}
