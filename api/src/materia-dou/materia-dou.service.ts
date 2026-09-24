import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../base.service';
import { MateriaDouEntity } from './entities/materia-dou.entity';
import { CreateMateriaDouDto } from './dto/create-materia-dou.dto';

@Injectable()
export class MateriaDouService extends BaseService<MateriaDouEntity> {
    constructor(
        @InjectRepository(MateriaDouEntity)
        materiaDouRepository: Repository<MateriaDouEntity>,
    ) {
        super(materiaDouRepository);
    }

    async create(dto: CreateMateriaDouDto): Promise<MateriaDouEntity> {
        return await this.persist(dto);
    }

    async list(): Promise<MateriaDouEntity[]> {
        return await this.findAllInstances({ order: { data: 'DESC' } });
    }

    async getById(id: string): Promise<MateriaDouEntity> {
        return await this.findInstanceByIdOrFail(id);
    }

    async remove(id: string): Promise<void> {
        await this.deleteInstanceById(id);
    }
}
