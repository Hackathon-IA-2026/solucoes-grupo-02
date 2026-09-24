import { IsArray, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateTrechoDto {
    @IsUUID()
    normaId!: string;

    @IsString()
    @IsOptional()
    artigo?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    ordem?: number;

    @IsString()
    texto!: string;

    @IsArray()
    @IsNumber({}, { each: true })
    @IsOptional()
    vetor?: number[];
}
