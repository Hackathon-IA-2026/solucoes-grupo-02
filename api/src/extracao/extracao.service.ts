import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../base.service';
import { ExtracaoEntity } from './entities/extracao.entity';
import { CreateExtracaoDto } from './dto/create-extracao.dto';

@Injectable()
export class ExtracaoService extends BaseService<ExtracaoEntity> {
    constructor(
        @InjectRepository(ExtracaoEntity)
        extracaoRepository: Repository<ExtracaoEntity>,
    ) {
        super(extracaoRepository);
    }

    async create(dto: CreateExtracaoDto): Promise<ExtracaoEntity> {
        return await this.persist(dto);
    }

    async listByNorma(normaId: string): Promise<ExtracaoEntity[]> {
        return await this.findAllInstances({ where: { normaId }, order: { data: 'DESC' } });
    }

    async getById(id: string): Promise<ExtracaoEntity> {
        return await this.findInstanceByIdOrFail(id);
    }

    async remove(id: string): Promise<void> {
        await this.deleteInstanceById(id);
    }
}
