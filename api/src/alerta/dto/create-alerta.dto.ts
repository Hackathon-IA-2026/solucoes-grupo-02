import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import type { AlertaSeveridade } from '../entities/alerta.entity';

export class CreateAlertaDto {
    @IsUUID()
    @IsOptional()
    limiteId?: string;

    @IsUUID()
    @IsOptional()
    normaId?: string;

    @IsString()
    @IsOptional()
    tipo?: string;

    @IsIn(['alto', 'medio', 'baixo'])
    severidade!: AlertaSeveridade;

    @IsString()
    titulo!: string;

    @IsString()
    mensagem!: string;

    @IsNumber()
    @IsOptional()
    valorDaUsina?: number;

    @IsNumber()
    @IsOptional()
    valorDoLimite?: number;

    @IsNumber()
    @IsOptional()
    distanciaPct?: number;
}
