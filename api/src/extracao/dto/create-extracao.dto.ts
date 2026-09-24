import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateExtracaoDto {
    @IsUUID()
    normaId!: string;

    @IsString()
    @IsOptional()
    hashDoTextoUsado?: string;

    @IsString()
    @IsOptional()
    modelo?: string;

    @IsString()
    @IsOptional()
    resumo?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    tokensGastos?: number;
}
