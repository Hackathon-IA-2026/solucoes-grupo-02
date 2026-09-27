import { BaseEntity } from '../../base.entity';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'noticias' })
export class NoticiaEntity extends BaseEntity {
    @Column()
    titulo!: string;

    @Column({ type: 'text', nullable: true })
    resumo?: string;

    @Column({ nullable: true })
    fonte?: string;

    @Column({ nullable: true })
    url?: string;

    @Column({ name: 'image_url', nullable: true })
    imageUrl?: string;

    @Column({ nullable: true })
    setor?: string;

    @Column({ type: 'text', array: true, default: '{}' })
    setores!: string[];

    @Column({ name: 'publicado_em', type: 'date', nullable: true })
    publicadoEm?: string;
}
