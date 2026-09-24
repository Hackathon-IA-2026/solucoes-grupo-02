import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMateriaDouDto {
    @IsDateString()
    @IsOptional()
    data?: string;

    @IsString()
    @IsOptional()
    secao?: string;

    @IsString()
    @IsOptional()
    tipoDeAto?: string;

    @IsString()
    @IsOptional()
    orgao?: string;

    @IsString()
    titulo!: string;

    @IsString()
    @IsOptional()
    ementa?: string;

    @IsString()
    @IsOptional()
    texto?: string;

    @IsString()
    @IsOptional()
    decisaoDoFiltroEMotivo?: string;

    @IsString()
    @IsOptional()
    subarea?: string;

    @IsUUID()
    @IsOptional()
    normaRelacionadaId?: string;
}
