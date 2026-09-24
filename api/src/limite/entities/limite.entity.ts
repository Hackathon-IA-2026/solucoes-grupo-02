import { BaseEntity } from '../../base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { NormaEntity } from '../../norma/entities/norma.entity';
import { ExtracaoEntity } from '../../extracao/entities/extracao.entity';

@Entity({ name: 'limites' })
export class LimiteEntity extends BaseEntity {
    @Column({ name: 'norma_id', type: 'uuid' })
    normaId!: string;

    @ManyToOne(() => NormaEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'norma_id' })
    norma?: NormaEntity;

    @Column({ name: 'extracao_id', type: 'uuid', nullable: true })
    extracaoId?: string;

    @ManyToOne(() => ExtracaoEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'extracao_id' })
    extracao?: ExtracaoEntity;

    @Column()
    parametro!: string;

    // ex: '>', '<', '>=', '<=', '='
    @Column()
    operador!: string;

    @Column({ type: 'float' })
    valor!: number;

    @Column({ nullable: true })
    unidade?: string;

    @Column({ name: 'valor_em_kw', type: 'float', nullable: true })
    valorEmKw?: number;

    @Column({ name: 'valor_maximo', type: 'float', nullable: true })
    valorMaximo?: number;

    @Column({ type: 'text', nullable: true })
    condicoes?: string;

    @Column({ nullable: true })
    vigencia?: string;

    @Column({ nullable: true })
    artigo?: string;

    @Column({ name: 'trecho_literal', type: 'text', nullable: true })
    trechoLiteral?: string;

    @Column({ default: 'pendente' })
    status!: string;
}
