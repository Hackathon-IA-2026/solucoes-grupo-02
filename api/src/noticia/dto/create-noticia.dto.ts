import { IsDateString, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateNoticiaDto {
    @IsString()
    titulo!: string;

    @IsString()
    @IsOptional()
    resumo?: string;

    @IsString()
    @IsOptional()
    fonte?: string;

    @IsUrl()
    @IsOptional()
    url?: string;

    @IsUrl()
    @IsOptional()
    imageUrl?: string;

    @IsString()
    @IsOptional()
    setor?: string;

    @IsDateString()
    @IsOptional()
    publicadoEm?: string;
}
