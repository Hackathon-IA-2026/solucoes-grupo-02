import { BaseEntity } from '../../base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity({ name: 'trechos' })
export class TrechoEntity extends BaseEntity {
    @Index()
    @Column({ name: 'norma_id', type: 'uuid' })
    normaId!: string;

    @Column({ name: 'artigo', nullable: true })
    artigo?: string;

    @Column({ name: 'ordem', type: 'int', default: 0 })
    ordem!: number;

    @Column({ name: 'texto', type: 'text' })
    texto!: string;

    // float8[] em vez de `vector`: o Postgres do projeto não tem pgvector.
    @Column({ name: 'vetor', type: 'float8', array: true, default: '{}' })
    vetor!: number[];
}
