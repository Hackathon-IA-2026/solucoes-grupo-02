import { BaseEntity } from '../../base.entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { CompanieEntity } from '../../companie/entities/companie.entity';

export interface PlantChannels {
    email: boolean;
    push: boolean;
    pdf: boolean;
}

@Entity({ name: 'configuracoes' })
export class PlantEntity extends BaseEntity {
    @Column({ name: 'company_id', type: 'uuid', nullable: true, unique: true })
    companyId?: string;

    @OneToOne(() => CompanieEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'company_id' })
    company?: CompanieEntity;

    @Column({ default: 'Minha usina' })
    name!: string;

    @Column({ default: 'Eólica' })
    kind!: string;

    @Column({ name: 'submarket', default: 'Nordeste' })
    submarket!: string;

    @Column({ name: 'contract_env', default: 'Livre (ACL)' })
    contractEnv!: string;

    @Column({ name: 'capacity_mw', type: 'float', default: 0 })
    capacityMw!: number;

    @Column({ name: 'capacity_limit_mw', type: 'float', default: 100 })
    capacityLimitMw!: number;

    @Column({ name: 'co2', type: 'float', default: 0 })
    co2!: number;

    @Column({ name: 'co2_limit', type: 'float', default: 1 })
    co2Limit!: number;

    @Column({ name: 'availability', type: 'float', default: 100 })
    availability!: number;

    @Column({ name: 'availability_min', type: 'float', default: 0 })
    availabilityMin!: number;

    @Column({ name: 'areas', type: 'text', array: true, default: '{}' })
    areas!: string[];

    @Column({ name: 'subareas', type: 'text', array: true, default: '{}' })
    subareas!: string[];

    @Column({ name: 'cegs', type: 'text', array: true, default: '{}' })
    cegs!: string[];

    @Column({ name: 'cnpjs', type: 'text', array: true, default: '{}' })
    cnpjs!: string[];

    @Column({ name: 'channels', type: 'jsonb', default: { email: true, push: true, pdf: false } })
    channels!: PlantChannels;

    @Column({ name: 'frequency', default: 'Imediato' })
    frequency!: string;

    @Column({ name: 'protocol_date', type: 'date', nullable: true })
    protocolDate?: string;

    @Column({ name: 'distributor', nullable: true })
    distributor?: string;

    @Column({ name: 'has_storage', default: false })
    hasStorage!: boolean;

    @Column({ name: 'major_holder_share_pct', type: 'float', nullable: true })
    majorHolderSharePct?: number;
}
