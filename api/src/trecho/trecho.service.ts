import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../base.service';
import { TrechoEntity } from './entities/trecho.entity';
import { CreateTrechoDto } from './dto/create-trecho.dto';

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

@Injectable()
export class TrechoService extends BaseService<TrechoEntity> {
    constructor(
        @InjectRepository(TrechoEntity)
        trechoRepository: Repository<TrechoEntity>,
    ) {
        super(trechoRepository);
    }

    async createTrecho(dto: CreateTrechoDto): Promise<TrechoEntity> {
        return await this.persist({ ...dto, vetor: dto.vetor ?? [] });
    }

    async listByNorma(normaId: string): Promise<TrechoEntity[]> {
        return await this.findAllInstances({ where: { normaId }, order: { ordem: 'ASC' } });
    }

    async getById(id: string): Promise<TrechoEntity> {
        return await this.findInstanceByIdOrFail(id);
    }

    async remove(id: string): Promise<void> {
        await this.deleteInstanceById(id);
    }

    // Busca por similaridade feita em memória — sem a extensão pgvector não dá pra
    // usar um índice ANN no banco. Funciona bem no volume de uma base de hackathon;
    // trocar por uma consulta com `vector <-> vector` quando a extensão existir.
    async search(vetor: number[], limit = 5): Promise<TrechoEntity[]> {
        const trechos = await this.findAllInstances();
        return trechos
            .map((t) => ({ trecho: t, score: cosineSimilarity(vetor, t.vetor) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((r) => r.trecho);
    }

    // Busca por palavra-chave, sem embedding nenhum — usada pelo Copiloto enquanto
    // não existe um serviço de geração de embeddings nem um LLM configurados.
    async searchByText(query: string, limit = 5): Promise<TrechoEntity[]> {
        const termos = query
            .toLowerCase()
            .split(/\s+/)
            .filter((t) => t.length > 2);
        if (termos.length === 0) return [];

        const trechos = await this.findAllInstances();
        return trechos
            .map((t) => {
                const texto = t.texto.toLowerCase();
                const score = termos.reduce((acc, termo) => acc + (texto.includes(termo) ? 1 : 0), 0);
                return { trecho: t, score };
            })
            .filter((r) => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((r) => r.trecho);
    }
}
