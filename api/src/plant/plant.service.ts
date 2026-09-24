import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { BaseService } from '../base.service';
import { PlantEntity } from './entities/plant.entity';
import { UpdatePlantDto } from './dto/update-plant.dto';

// Molda a entidade pro formato que o front (AlertsPage/DashboardPage/AppShell)
// já consome — sem campos internos do banco (`createdAt`/`updatedAt`/`deletedAt`),
// que o front reenviaria sem querer no próximo PUT.
export function toPlantResponse(plant: PlantEntity) {
    return {
        id: plant.id,
        name: plant.name,
        kind: plant.kind,
        submarket: plant.submarket,
        contractEnv: plant.contractEnv,
        capacityMw: plant.capacityMw,
        capacityLimitMw: plant.capacityLimitMw,
        co2: plant.co2,
        co2Limit: plant.co2Limit,
        availability: plant.availability,
        availabilityMin: plant.availabilityMin,
        areas: plant.areas,
        subareas: plant.subareas,
        channels: plant.channels,
        frequency: plant.frequency,
    };
}

@Injectable()
export class PlantService extends BaseService<PlantEntity> {
    constructor(
        @InjectRepository(PlantEntity)
        plantRepository: Repository<PlantEntity>,
    ) {
        super(plantRepository);
    }

    // Cada empresa tem uma configuração de usina (criada no cadastro; se faltar, nasce com os padrões).
    async getPlant(companyId: string): Promise<PlantEntity> {
        const existing = await this.repository.findOneBy({ companyId });
        if (existing) return existing;
        return await this.persist({ companyId });
    }

    // Todas as usinas com empresa — o motor de alertas avalia cada uma.
    async listAll(): Promise<PlantEntity[]> {
        return await this.findAllInstances({ where: { companyId: Not(IsNull()) } });
    }

    async updatePlant(companyId: string, patch: UpdatePlantDto): Promise<PlantEntity> {
        const plant = await this.getPlant(companyId);
        const { id, ...safePatch } = patch;
        return await this.updateInstance(plant.id, safePatch as Partial<PlantEntity>);
    }
}
