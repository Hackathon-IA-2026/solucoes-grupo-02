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

    // Setor/área a que a notícia se refere (ex: "Eólica", "Solar") — cruza com
    // `Plant.kind`/`areas` pra decidir o que é relevante pra essa empresa.
    @Column({ nullable: true })
    setor?: string;

    // Áreas da taxonomia (Solar, Eólica, Armazenamento) de que a notícia trata — a coleta
    // automática (coletor.service.ts) marca todas; `setor` fica com a primeira.
    @Column({ type: 'text', array: true, default: '{}' })
    setores!: string[];

    @Column({ name: 'publicado_em', type: 'date', nullable: true })
    publicadoEm?: string;
}
