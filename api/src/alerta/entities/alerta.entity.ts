import { BaseEntity } from '../../base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { NormaEntity } from '../../norma/entities/norma.entity';
import { LimiteEntity } from '../../limite/entities/limite.entity';
import { CompanieEntity } from '../../companie/entities/companie.entity';

export type AlertaSeveridade = 'alto' | 'medio' | 'baixo';

@Entity({ name: 'alertas' })
export class AlertaEntity extends BaseEntity {
    @Index()
    @Column({ name: 'company_id', type: 'uuid', nullable: true })
    companyId?: string;

    @ManyToOne(() => CompanieEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'company_id' })
    company?: CompanieEntity;

    @Column({ name: 'limite_id', type: 'uuid', nullable: true })
    limiteId?: string;

    @ManyToOne(() => LimiteEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'limite_id' })
    limite?: LimiteEntity;

    @Column({ name: 'norma_id', type: 'uuid', nullable: true })
    normaId?: string;

    @ManyToOne(() => NormaEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'norma_id' })
    norma?: NormaEntity;

    @Column({ nullable: true })
    tipo?: string;

    @Column({ type: 'enum', enum: ['alto', 'medio', 'baixo'] })
    severidade!: AlertaSeveridade;

    @Column()
    titulo!: string;

    @Column({ type: 'text' })
    mensagem!: string;

    @Column({ name: 'valor_da_usina', type: 'float', nullable: true })
    valorDaUsina?: number;

    @Column({ name: 'valor_do_limite', type: 'float', nullable: true })
    valorDoLimite?: number;

    @Column({ name: 'distancia_pct', type: 'float', nullable: true })
    distanciaPct?: number;

    @Column({ default: false })
    lido!: boolean;
}
