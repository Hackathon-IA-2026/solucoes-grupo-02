import { BaseEntity } from '../../base.entity';
import { Column, Entity } from 'typeorm';

export type NormaSource = 'aneel' | 'ccee' | 'dou';
export type NormaImpact = 'alto' | 'medio' | 'baixo';
export type NormaAbrangencia = 'geral' | 'individual';

@Entity({ name: 'normas' })
export class NormaEntity extends BaseEntity {
    @Column({ type: 'enum', enum: ['aneel', 'ccee', 'dou'] })
    source!: NormaSource;

    @Column({ nullable: true })
    code?: string;

    @Column()
    title!: string;

    @Column({ type: 'text', nullable: true })
    lead?: string;

    @Column({ nullable: true })
    deadline?: string;

    @Column({ name: 'deadline_at', type: 'date', nullable: true })
    deadlineAt?: string;

    @Column({ type: 'text', array: true, default: '{}' })
    changes!: string[];

    @Column({ name: 'change_sources', type: 'text', array: true, default: '{}' })
    changeSources!: string[];

    @Column({ type: 'text', nullable: true })
    why?: string;

    @Column({ type: 'enum', enum: ['alto', 'medio', 'baixo'], default: 'baixo' })
    impact!: NormaImpact;

    @Column({ type: 'date', nullable: true })
    publishedAt?: string;

    @Column({ nullable: true })
    url?: string;

    @Column({ default: false })
    canonica!: boolean;

    @Column({ nullable: true })
    orgao?: string;

    @Column({ nullable: true })
    tipo?: string;

    @Column({ nullable: true })
    numero?: string;

    @Column({ nullable: true })
    area?: string;

    @Column({ nullable: true })
    subarea?: string;

    @Column({ type: 'varchar', length: 10, default: 'geral' })
    abrangencia!: NormaAbrangencia;

    @Column({ type: 'text', array: true, default: '{}' })
    cnpjs!: string[];

    @Column({ type: 'text', array: true, default: '{}' })
    cegs!: string[];

    @Column({ name: 'fonte_oficial', nullable: true })
    fonteOficial?: string;

    @Column({ nullable: true })
    situacao?: string;

    @Column({ nullable: true })
    hash?: string;

    @Column({ name: 'texto_completo', type: 'text', nullable: true })
    textoCompleto?: string;

    @Column({ name: 'coletado_em', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    coletadoEm!: Date;
}
