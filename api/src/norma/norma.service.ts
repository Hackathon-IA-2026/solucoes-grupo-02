import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseService } from '../base.service';
import { NormaEntity, NormaSource } from './entities/norma.entity';
import { CreateNormaDto } from './dto/create-norma.dto';
import { UpdateNormaDto } from './dto/update-norma.dto';
import { normaInteressa, PerfilDaEmpresa } from '../alerta/assuntos-monitorados';

export { toNormResponse } from './norma.response';

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

    async list(plant: PerfilDaEmpresa, source?: NormaSource, porArea = true): Promise<NormaEntity[]> {
        const normas = await this.findAllInstances({
            where: { canonica: false, ...(source ? { source } : {}) },
            order: { publishedAt: 'DESC', createdAt: 'DESC' },
        });
        return normas.filter((n) => normaInteressa(n, plant, porArea));
    }

    async listCanonicas(): Promise<NormaEntity[]> {
        return await this.findAllInstances({
            where: { canonica: true },
            select: { id: true, code: true, title: true, url: true },
            order: { code: 'ASC' },
        });
    }

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
