import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseService } from '../base.service';
import { NormaEntity, NormaSource } from './entities/norma.entity';
import { CreateNormaDto } from './dto/create-norma.dto';
import { UpdateNormaDto } from './dto/update-norma.dto';
import { normaInteressa, PerfilDaEmpresa } from '../alerta/assuntos-monitorados';

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
        publishedAt: norma.publishedAt,
        title: norma.title,
        lead: norma.lead ?? '',
        deadline: norma.deadline ?? '',
        deadlineAt: norma.deadlineAt,
        changes: norma.changes ?? [],
        changeSources: norma.changeSources ?? [],
        subareas: (norma.subarea ?? '')
            .split(';')
            .map((s) => s.trim())
            .filter(Boolean),
        why: norma.why ?? '',
        url: norma.url,
        canonica: norma.canonica,
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

    // O feed da empresa: os atos gerais das áreas/subáreas que ela monitora (o feed "do setor
    // de escolha do usuário"; com `porArea: false` ou sem área marcada, todos os gerais) e os
    // atos individuais que citam a empresa ou uma usina dela — os de outras empresas ficam de fora.
    async list(plant: PerfilDaEmpresa, source?: NormaSource, porArea = true): Promise<NormaEntity[]> {
        // normas canônicas são a base do copiloto, não novidades: ficam fora do feed
        const normas = await this.findAllInstances({
            where: { canonica: false, ...(source ? { source } : {}) },
            order: { publishedAt: 'DESC', createdAt: 'DESC' },
        });
        return normas.filter((n) => normaInteressa(n, plant, porArea));
    }

    // Novidades já gravadas, com o texto, para o `ai/reclassificar.py` refazer a classificação.
    async listNovidadesComTexto(): Promise<NormaEntity[]> {
        return await this.findAllInstances({ where: { canonica: false }, order: { publishedAt: 'ASC' } });
    }

    // "14300" acha a Lei nº 14.300 (o número é guardado com ponto, como no título).
    async findIdsByNumeros(digitos: string[]): Promise<string[]> {
        if (!digitos.length) return [];
        const normas = await this.repository
            .createQueryBuilder('n')
            .select('n.id')
            .where("REPLACE(n.numero, '.', '') IN (:...digitos)", { digitos })
            .getMany();
        return normas.map((n) => n.id);
    }

    async getByIds(ids: string[]): Promise<NormaEntity[]> {
        return ids.length ? await this.repository.findBy({ id: In(ids) }) : [];
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
