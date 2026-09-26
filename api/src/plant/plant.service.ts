import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { BaseService } from '../base.service';
import { PlantEntity } from './entities/plant.entity';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { normalizarCeg } from '../utils/ceg';
import { raizCnpj, somenteDigitos } from '../utils/cnpj';

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

    // Cada empresa tem uma configuração de usina (criada no cadastro; se faltar, nasce com os padrões).
    // Vem com a empresa: o CNPJ dela é o que liga a empresa aos atos individuais (despachos, multas...).
    async getPlant(companyId: string): Promise<PlantEntity> {
        const existing = await this.repository.findOne({ where: { companyId }, relations: { company: true } });
        if (existing) return existing;
        await this.persist({ companyId });
        return await this.getPlant(companyId);
    }

    // Todas as usinas com empresa — o motor de alertas avalia cada uma.
    async listAll(): Promise<PlantEntity[]> {
        return await this.findAllInstances({ where: { companyId: Not(IsNull()) }, relations: { company: true } });
    }

    // Raízes de CNPJ e CEGs de todos os clientes: o pipeline só resume e envia um ato
    // individual (despacho sobre uma usina, multa...) se ele citar algum destes.
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
        delete safePatch.id; // a usina é sempre a da empresa logada, nunca a do corpo
        const normalizado: Partial<PlantEntity> = { ...(safePatch as Partial<PlantEntity>) };
        // O DTO já validou: aqui só padroniza para comparar com o que o pipeline extrai do DOU.
        if (cegs) normalizado.cegs = [...new Set(cegs.map((c) => normalizarCeg(c)!))];
        if (cnpjs) normalizado.cnpjs = [...new Set(cnpjs.map(somenteDigitos))];
        return await this.updateInstance(plant.id, normalizado);
    }
}
