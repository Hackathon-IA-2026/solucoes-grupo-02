import { IsArray, IsDateString, IsIn, IsOptional, IsString, IsUrl } from 'class-validator';
import type { NormaImpact, NormaSource } from '../entities/norma.entity';

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

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    changes?: string[];

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
