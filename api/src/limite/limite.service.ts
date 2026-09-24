import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../base.service';
import { LimiteEntity } from './entities/limite.entity';
import { CreateLimiteDto } from './dto/create-limite.dto';
import { UpdateLimiteDto } from './dto/update-limite.dto';

@Injectable()
export class LimiteService extends BaseService<LimiteEntity> {
    constructor(
        @InjectRepository(LimiteEntity)
        limiteRepository: Repository<LimiteEntity>,
    ) {
        super(limiteRepository);
    }

    async create(dto: CreateLimiteDto): Promise<LimiteEntity> {
        return await this.persist(dto);
    }

    async listByNorma(normaId: string): Promise<LimiteEntity[]> {
        return await this.findAllInstances({ where: { normaId } });
    }

    async listAll(): Promise<LimiteEntity[]> {
        return await this.findAllInstances();
    }

    async getById(id: string): Promise<LimiteEntity> {
        return await this.findInstanceByIdOrFail(id);
    }

    async update(id: string, dto: UpdateLimiteDto): Promise<LimiteEntity> {
        return await this.updateInstance(id, dto);
    }

    async remove(id: string): Promise<void> {
        await this.deleteInstanceById(id);
    }
}
