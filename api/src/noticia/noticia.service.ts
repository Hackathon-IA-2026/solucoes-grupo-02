import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseService } from '../base.service';
import { NoticiaEntity } from './entities/noticia.entity';
import { CreateNoticiaDto } from './dto/create-noticia.dto';

function formatDate(value?: string): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function toNoticiaResponse(noticia: NoticiaEntity) {
    return {
        id: noticia.id,
        title: noticia.titulo,
        summary: noticia.resumo ?? '',
        source: noticia.fonte ?? '',
        url: noticia.url,
        imageUrl: noticia.imageUrl,
        setor: noticia.setor,
        setores: noticia.setores?.length ? noticia.setores : noticia.setor ? [noticia.setor] : [],
        date: formatDate(noticia.publicadoEm),
    };
}

@Injectable()
export class NoticiaService extends BaseService<NoticiaEntity> {
    constructor(
        @InjectRepository(NoticiaEntity)
        noticiaRepository: Repository<NoticiaEntity>,
    ) {
        super(noticiaRepository);
    }

    async create(dto: CreateNoticiaDto): Promise<NoticiaEntity> {
        return await this.persist(dto);
    }

    async list(setor?: string, areas?: string[]): Promise<NoticiaEntity[]> {
        const noticias = await this.findAllInstances({ order: { publicadoEm: 'DESC', createdAt: 'DESC' }, take: 300 });
        const deAlguma = (n: NoticiaEntity, lista: string[]) => (n.setores?.length ? n.setores : [n.setor]).some((s) => s && lista.includes(s));
        return noticias.filter((n) => (!setor || deAlguma(n, [setor])) && (!areas?.length || deAlguma(n, areas))).slice(0, 60);
    }

    async urlsExistentes(urls: string[]): Promise<Set<string>> {
        if (urls.length === 0) return new Set();
        const achadas = await this.findAllInstances({ where: { url: In(urls) }, select: { id: true, url: true } });
        return new Set(achadas.map((n) => n.url!));
    }

    async createMany(noticias: Array<Partial<NoticiaEntity>>): Promise<number> {
        if (noticias.length === 0) return 0;
        return (await this.repository.save(this.repository.create(noticias))).length;
    }

    async getById(id: string): Promise<NoticiaEntity> {
        return await this.findInstanceByIdOrFail(id);
    }

    async remove(id: string): Promise<void> {
        await this.deleteInstanceById(id);
    }
}
