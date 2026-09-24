import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../base.service';
import { NoticiaEntity } from './entities/noticia.entity';
import { CreateNoticiaDto } from './dto/create-noticia.dto';

function formatDate(value?: string): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Molda a entidade pro formato de card que o front (tela de Notícias) consome.
export function toNoticiaResponse(noticia: NoticiaEntity) {
    return {
        id: noticia.id,
        title: noticia.titulo,
        summary: noticia.resumo ?? '',
        source: noticia.fonte ?? '',
        url: noticia.url,
        imageUrl: noticia.imageUrl,
        setor: noticia.setor,
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

    async list(setor?: string): Promise<NoticiaEntity[]> {
        return await this.findAllInstances({
            where: setor ? { setor } : undefined,
            order: { publicadoEm: 'DESC' },
        });
    }

    async getById(id: string): Promise<NoticiaEntity> {
        return await this.findInstanceByIdOrFail(id);
    }

    async remove(id: string): Promise<void> {
        await this.deleteInstanceById(id);
    }
}
