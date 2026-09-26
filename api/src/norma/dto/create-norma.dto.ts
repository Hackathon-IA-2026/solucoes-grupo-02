import { IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUrl } from 'class-validator';
import type { NormaAbrangencia, NormaImpact, NormaSource } from '../entities/norma.entity';

export class CreateNormaDto {
    @IsIn(['aneel', 'ccee', 'dou'])
    source!: NormaSource;

    @IsString()
    title!: string;

    @IsString()
    @IsOptional()
    code?: string;

    @IsString()
    @IsOptional()
    lead?: string;

    @IsString()
    @IsOptional()
    deadline?: string;

    @IsDateString()
    @IsOptional()
    deadlineAt?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    changes?: string[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    changeSources?: string[];

    @IsString()
    @IsOptional()
    why?: string;

    @IsIn(['alto', 'medio', 'baixo'])
    @IsOptional()
    impact?: NormaImpact;

    @IsDateString()
    @IsOptional()
    publishedAt?: string;

    @IsUrl()
    @IsOptional()
    url?: string;

    @IsBoolean()
    @IsOptional()
    canonica?: boolean;

    @IsString()
    @IsOptional()
    orgao?: string;

    @IsString()
    @IsOptional()
    tipo?: string;

    @IsString()
    @IsOptional()
    numero?: string;

    @IsString()
    @IsOptional()
    area?: string;

    @IsString()
    @IsOptional()
    subarea?: string;

    @IsIn(['geral', 'individual'])
    @IsOptional()
    abrangencia?: NormaAbrangencia;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    cnpjs?: string[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    cegs?: string[];

    @IsString()
    @IsOptional()
    fonteOficial?: string;

    @IsString()
    @IsOptional()
    situacao?: string;

    @IsString()
    @IsOptional()
    hash?: string;

    @IsString()
    @IsOptional()
    textoCompleto?: string;
}
