import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLimiteDto {
    @IsUUID()
    normaId!: string;

    @IsUUID()
    @IsOptional()
    extracaoId?: string;

    @IsString()
    parametro!: string;

    @IsIn(['>', '<', '>=', '<=', '='])
    operador!: string;

    @IsNumber()
    valor!: number;

    @IsString()
    @IsOptional()
    unidade?: string;

    @IsNumber()
    @IsOptional()
    valorEmKw?: number;

    @IsNumber()
    @IsOptional()
    valorMaximo?: number;

    @IsString()
    @IsOptional()
    condicoes?: string;

    @IsString()
    @IsOptional()
    vigencia?: string;

    @IsString()
    @IsOptional()
    artigo?: string;

    @IsString()
    @IsOptional()
    trechoLiteral?: string;

    @IsString()
    @IsOptional()
    status?: string;
}
