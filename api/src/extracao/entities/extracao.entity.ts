import { BaseEntity } from '../../base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { NormaEntity } from '../../norma/entities/norma.entity';

@Entity({ name: 'extracoes' })
export class ExtracaoEntity extends BaseEntity {
    @Column({ name: 'norma_id', type: 'uuid' })
    normaId!: string;

    @ManyToOne(() => NormaEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'norma_id' })
    norma?: NormaEntity;

    @Column({ name: 'hash_do_texto_usado', nullable: true })
    hashDoTextoUsado?: string;

    @Column({ nullable: true })
    modelo?: string;

    @Column({ type: 'text', nullable: true })
    resumo?: string;

    @Column({ name: 'tokens_gastos', type: 'int', nullable: true })
    tokensGastos?: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    data!: Date;
}
