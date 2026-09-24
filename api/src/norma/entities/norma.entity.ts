import { BaseEntity } from '../../base.entity';
import { Column, Entity } from 'typeorm';

export type NormaSource = 'aneel' | 'ccee' | 'dou';
export type NormaImpact = 'alto' | 'medio' | 'baixo';

@Entity({ name: 'normas' })
export class NormaEntity extends BaseEntity {
    // Campos "de vitrine", prontos pro formato que o front (Dashboard/Resumos) consome.
    @Column({ type: 'enum', enum: ['aneel', 'ccee', 'dou'] })
    source!: NormaSource;

    @Column({ nullable: true })
    code?: string;

    @Column()
    title!: string;

    @Column({ type: 'text', nullable: true })
    lead?: string;

    @Column({ nullable: true })
    deadline?: string;

    // Data do próximo prazo (o `deadline` acima é o texto pra exibir) — o painel usa
    // pra contar "prazos que vencem esta semana".
    @Column({ name: 'deadline_at', type: 'date', nullable: true })
    deadlineAt?: string;

    @Column({ type: 'text', array: true, default: '{}' })
    changes!: string[];

    // "Por que importa pra você": hoje é global por norma (simplificação de MVP).
    // O correto a médio prazo é isso vir personalizado por empresa, cruzando com
    // `limites`/`configuracoes` em vez de morar fixo aqui.
    @Column({ type: 'text', nullable: true })
    why?: string;

    @Column({ type: 'enum', enum: ['alto', 'medio', 'baixo'], default: 'baixo' })
    impact!: NormaImpact;

    @Column({ type: 'date', nullable: true })
    publishedAt?: string;

    @Column({ nullable: true })
    url?: string;

    // Campos "de ingestão", como documentado em ENDPOINTS.md — preenchidos pelo
    // pipeline de coleta/extração quando ele existir.
    @Column({ nullable: true })
    orgao?: string;

    @Column({ nullable: true })
    tipo?: string;

    @Column({ nullable: true })
    numero?: string;

    @Column({ nullable: true })
    area?: string;

    @Column({ nullable: true })
    subarea?: string;

    @Column({ name: 'fonte_oficial', nullable: true })
    fonteOficial?: string;

    @Column({ nullable: true })
    situacao?: string;

    @Column({ nullable: true })
    hash?: string;

    @Column({ name: 'texto_completo', type: 'text', nullable: true })
    textoCompleto?: string;

    @Column({ name: 'coletado_em', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    coletadoEm!: Date;
}
