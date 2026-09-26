import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { normalizarCeg } from '../utils/ceg';
import { raizCnpj } from '../utils/cnpj';

// Dados abertos da ANEEL, "Agentes de Geração de Energia Elétrica": cada linha liga o CNPJ
// de um agente a uma usina (CEG) com o percentual de participação. A ANEEL atualiza todo mês
// (~4,5 MB, ~25 mil linhas); a API baixa na primeira consulta e guarda por um dia.
const URL_AGENTES =
    'https://dadosabertos.aneel.gov.br/dataset/283a0172-3966-49e7-ae45-d2885ad17b03/resource/20ef769f-a072-489d-9df4-c834529f8a78/download/agentes-geracao-energia-eletrica.csv';
const VALIDADE_MS = 24 * 60 * 60 * 1000;

export interface UsinaAneel {
    ceg: string; // normalizado, o formato guardado em `configuracoes.cegs`
    codigoCeg: string; // como a ANEEL escreve, ex.: "EOL.CV.RN.007663-4.1"
    nome: string;
    tipo: string; // EOL, UFV, PCH, UTE...
    fase: string; // Operação, Construção...
    cnpj: string;
    agente: string;
    participacaoPct: number;
}

// Todos os campos do CSV vêm entre aspas e separados por ";" ("a";"b";"c").
export function lerCsvAgentes(csv: string): UsinaAneel[] {
    const linhas = csv.split(/\r?\n/).filter((l) => l.trim());
    const campos = (linha: string) => linha.trim().slice(1, -1).split('";"');
    const cabecalho = campos(linhas[0] ?? '');
    const col = (nome: string) => cabecalho.indexOf(nome);
    const [iCnpj, iAgente, iCeg, iNome, iPct, iTipo, iFase] = [
        'NumCPFCNPJ',
        'NomAgente',
        'CodCEG',
        'NomEmpreendimento',
        'PctParticipacao',
        'SigTipoGeracao',
        'DscFaseUsina',
    ].map(col);

    return linhas.slice(1).flatMap((linha) => {
        const c = campos(linha);
        const doc = (c[iCnpj] ?? '').replace(/\D/g, '');
        const ceg = normalizarCeg(c[iCeg] ?? '');
        // 11 dígitos ou menos é CPF (pessoa física); CNPJ com zero à esquerda pode vir sem ele
        if (doc.length <= 11 || !ceg) return [];
        return [
            {
                ceg,
                codigoCeg: c[iCeg],
                nome: c[iNome] ?? '',
                tipo: c[iTipo] ?? '',
                fase: c[iFase] ?? '',
                cnpj: doc.padStart(14, '0'),
                agente: c[iAgente] ?? '',
                participacaoPct: Number((c[iPct] ?? '').replace(',', '.')) || 0,
            },
        ];
    });
}

@Injectable()
export class UsinasAneelService {
    private readonly logger = new Logger(UsinasAneelService.name);
    private cache?: { em: number; usinas: UsinaAneel[] };
    private baixando?: Promise<UsinaAneel[]>;

    // Usinas em que algum destes CNPJs (pela raiz: matriz e filiais) tem participação.
    async porCnpjs(cnpjs: string[]): Promise<UsinaAneel[]> {
        const raizes = new Set(cnpjs.map(raizCnpj));
        if (raizes.size === 0) return [];
        const vistos = new Set<string>();
        return (await this.usinas())
            .filter((u) => raizes.has(raizCnpj(u.cnpj)) && !vistos.has(u.ceg) && vistos.add(u.ceg))
            .sort((a, b) => a.nome.localeCompare(b.nome));
    }

    private async usinas(): Promise<UsinaAneel[]> {
        if (this.cache && Date.now() - this.cache.em < VALIDADE_MS) return this.cache.usinas;
        this.baixando ??= this.baixar().finally(() => (this.baixando = undefined));
        return await this.baixando;
    }

    private async baixar(): Promise<UsinaAneel[]> {
        try {
            const r = await fetch(URL_AGENTES, { signal: AbortSignal.timeout(60_000) });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const usinas = lerCsvAgentes(await r.text());
            this.cache = { em: Date.now(), usinas };
            this.logger.log(`Agentes de geração da ANEEL carregados: ${usinas.length} participações.`);
            return usinas;
        } catch (err) {
            this.logger.warn(`Falha ao baixar os agentes de geração da ANEEL: ${(err as Error).message}`);
            if (this.cache) return this.cache.usinas; // melhor a versão de ontem que nada
            throw new ServiceUnavailableException('Não foi possível consultar os dados abertos da ANEEL agora. Tente de novo em instantes.');
        }
    }
}
