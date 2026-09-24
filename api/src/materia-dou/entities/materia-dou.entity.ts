import { BaseEntity } from '../../base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { NormaEntity } from '../../norma/entities/norma.entity';

@Entity({ name: 'materias_dou' })
export class MateriaDouEntity extends BaseEntity {
    @Column({ type: 'date', nullable: true })
    data?: string;

    @Column({ nullable: true })
    secao?: string;

    @Column({ name: 'tipo_de_ato', nullable: true })
    tipoDeAto?: string;

    @Column({ nullable: true })
    orgao?: string;

    @Column()
    titulo!: string;

    @Column({ type: 'text', nullable: true })
    ementa?: string;

    @Column({ type: 'text', nullable: true })
    texto?: string;

    @Column({ name: 'decisao_do_filtro_e_motivo', type: 'text', nullable: true })
    decisaoDoFiltroEMotivo?: string;

    @Column({ nullable: true })
    subarea?: string;

    @Column({ name: 'norma_relacionada_id', type: 'uuid', nullable: true })
    normaRelacionadaId?: string;

    @ManyToOne(() => NormaEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'norma_relacionada_id' })
    normaRelacionada?: NormaEntity;
}
