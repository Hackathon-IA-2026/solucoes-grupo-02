import { BaseEntity } from '../../base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity({ name: 'trechos' })
export class TrechoEntity extends BaseEntity {
    // Ainda não há uma NormaEntity no projeto (tabela "normas" é de outra frente).
    // Por enquanto isso fica como uma FK "solta", sem @ManyToOne — trocar por uma
    // relação de verdade assim que a entidade de normas existir.
    @Index()
    @Column({ name: 'norma_id', type: 'uuid' })
    normaId!: string;

    @Column({ name: 'artigo', nullable: true })
    artigo?: string;

    @Column({ name: 'ordem', type: 'int', default: 0 })
    ordem!: number;

    @Column({ name: 'texto', type: 'text' })
    texto!: string;

    // Sem a extensão pgvector disponível (postgres:16-alpine puro no docker-compose),
    // o embedding fica como array nativo de float8. Dá pra trocar pelo tipo `vector`
    // (com índice ivfflat/hnsw) quando a extensão for habilitada no banco.
    @Column({ name: 'vetor', type: 'float8', array: true, default: '{}' })
    vetor!: number[];
}
