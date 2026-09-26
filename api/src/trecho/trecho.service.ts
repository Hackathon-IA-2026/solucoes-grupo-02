import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../base.service';
import { TrechoEntity } from './entities/trecho.entity';
import { CreateTrechoDto } from './dto/create-trecho.dto';
import { normalizar } from '../utils/texto';
import { IndiceVetorial, Referencias, TrechoSemelhante } from './indice-vetorial';

// Palavras que não dizem nada do tema da pergunta (já sem acento, como sai do `normalizar`).
const PALAVRAS_VAZIAS = new Set(
    (
        'que qual quais como para por com sem uma uns umas dos das nos nas pelo pela sobre isso esse essa este esta minha meu sua seu ' +
        'preciso posso devo fazer quando onde norma regra ate tem ser sao foi mais muito'
    ).split(' '),
);

@Injectable()
export class TrechoService extends BaseService<TrechoEntity> {
    constructor(
        @InjectRepository(TrechoEntity)
        trechoRepository: Repository<TrechoEntity>,
    ) {
        super(trechoRepository);
    }

    async createTrecho(dto: CreateTrechoDto): Promise<TrechoEntity> {
        const trecho = await this.persist({ ...dto, vetor: dto.vetor ?? [] });
        this.invalidarIndice();
        return trecho;
    }

    async listByNorma(normaId: string): Promise<TrechoEntity[]> {
        return await this.findAllInstances({ where: { normaId }, order: { ordem: 'ASC' } });
    }

    async getById(id: string): Promise<TrechoEntity> {
        return await this.findInstanceByIdOrFail(id);
    }

    async remove(id: string): Promise<void> {
        await this.deleteInstanceById(id);
        this.invalidarIndice();
    }

    // Busca vetorial do copiloto (ver IndiceVetorial): carrega os vetores uma vez.
    private readonly indice = new IndiceVetorial(() =>
        this.repository.find({ select: { id: true, normaId: true, artigo: true, texto: true, vetor: true } }),
    );

    invalidarIndice(): void {
        this.indice.invalidar();
    }

    async buscarSemelhantes(vetor: number[], limite = 10, referencias?: Referencias): Promise<TrechoSemelhante[]> {
        return await this.indice.buscar(vetor, limite, referencias);
    }

    // Busca por palavra-chave, sem embedding nenhum — usada pelo Copiloto enquanto
    // não existe um serviço de geração de embeddings nem um LLM configurados.
    // Ignora acentos ("geracao" acha "geração") e palavras que não dizem nada do tema.
    async searchByText(query: string, limit = 5): Promise<TrechoEntity[]> {
        const termos = normalizar(query)
            .split(/[^a-z0-9]+/)
            .filter((t) => t.length > 2 && !PALAVRAS_VAZIAS.has(t));
        if (termos.length === 0) return [];

        // sem a coluna `vetor`: a busca por palavra não usa, e são 1024 números por trecho
        const trechos = await this.findAllInstances({ select: { id: true, normaId: true, artigo: true, texto: true } });
        return trechos
            .map((t) => {
                const texto = normalizar(t.texto);
                const score = termos.reduce((acc, termo) => acc + (texto.includes(termo) ? 1 : 0), 0);
                return { trecho: t, score };
            })
            .filter((r) => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((r) => r.trecho);
    }
}
