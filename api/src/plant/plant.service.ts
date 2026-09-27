import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { BaseService } from '../base.service';
import { PlantEntity } from './entities/plant.entity';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { normalizarCeg } from '../utils/ceg';
import { raizCnpj, somenteDigitos } from '../utils/cnpj';

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
        cegs: plant.cegs,
        cnpjs: plant.cnpjs,
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

    async getPlant(companyId: string): Promise<PlantEntity> {
        const existing = await this.repository.findOne({ where: { companyId }, relations: { company: true } });
        if (existing) return existing;
        await this.persist({ companyId });
        return await this.getPlant(companyId);
    }

    async listAll(): Promise<PlantEntity[]> {
        return await this.findAllInstances({ where: { companyId: Not(IsNull()) }, relations: { company: true } });
    }

    async identificadoresDosClientes(): Promise<{ raizesCnpj: string[]; cegs: string[] }> {
        const plants = await this.listAll();
        const cnpjs = plants.flatMap((p) => [p.company?.cnpj, ...(p.cnpjs ?? [])]).filter((c): c is string => Boolean(c));
        return {
            raizesCnpj: [...new Set(cnpjs.map(raizCnpj))].sort(),
            cegs: [...new Set(plants.flatMap((p) => p.cegs ?? []))].sort(),
        };
    }

    async updatePlant(companyId: string, patch: UpdatePlantDto): Promise<PlantEntity> {
        const plant = await this.getPlant(companyId);
        const { cegs, cnpjs, ...safePatch } = patch;
        delete safePatch.id;
        const normalizado: Partial<PlantEntity> = { ...(safePatch as Partial<PlantEntity>) };
        if (cegs) normalizado.cegs = [...new Set(cegs.map((c) => normalizarCeg(c)!))];
        if (cnpjs) normalizado.cnpjs = [...new Set(cnpjs.map(somenteDigitos))];
        return await this.updateInstance(plant.id, normalizado);
    }
}
