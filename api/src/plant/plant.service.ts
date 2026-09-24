import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../base.service';
import { PlantEntity } from './entities/plant.entity';
import { UpdatePlantDto } from './dto/update-plant.dto';

@Injectable()
export class PlantService extends BaseService<PlantEntity> {
    constructor(
        @InjectRepository(PlantEntity)
        plantRepository: Repository<PlantEntity>,
    ) {
        super(plantRepository);
    }

    async getPlant(): Promise<PlantEntity> {
        const [existing] = await this.findAllInstances({ take: 1 });
        if (existing) return existing;
        return await this.persist({});
    }

    async updatePlant(patch: UpdatePlantDto): Promise<PlantEntity> {
        const plant = await this.getPlant();
        return await this.updateInstance(plant.id, patch as Partial<PlantEntity>);
    }
}
