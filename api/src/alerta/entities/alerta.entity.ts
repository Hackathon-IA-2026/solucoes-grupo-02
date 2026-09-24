import { BaseEntity } from '../../base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { NormaEntity } from '../../norma/entities/norma.entity';
import { LimiteEntity } from '../../limite/entities/limite.entity';

export type AlertaSeveridade = 'alto' | 'medio' | 'baixo';

@Entity({ name: 'alertas' })
export class AlertaEntity extends BaseEntity {
    // Como cada instância/banco é de uma única usina (empresa fixa via .env),
    // não precisa de FK pra "usina" — é implícito.

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
