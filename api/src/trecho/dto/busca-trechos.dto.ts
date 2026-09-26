import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';

export class BuscaTrechosDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(4096)
    @IsNumber({}, { each: true })
    vetor!: number[];

    @IsInt()
    @Min(1)
    @Max(50)
    @IsOptional()
    limite?: number;

    // Números de norma citados na pergunta, só dígitos ("14300" para a Lei 14.300)
    @IsArray()
    @ArrayMaxSize(10)
    @Matches(/^\d{1,8}$/, { each: true })
    @IsOptional()
    numeros?: string[];

    // Números de artigo citados ("26" para "art. 26")
    @IsArray()
    @ArrayMaxSize(10)
    @Matches(/^\d{1,4}$/, { each: true })
    @IsOptional()
    artigos?: string[];

    // Ids de normas cujos trechos entram como referência (a norma em foco na pergunta)
    @IsArray()
    @ArrayMaxSize(10)
    @IsUUID('all', { each: true })
    @IsOptional()
    normaIds?: string[];

    // Só os trechos das normas citadas (o copiloto usa para trazer a canônica que uma novidade altera)
    @IsBoolean()
    @IsOptional()
    somenteReferencias?: boolean;
}
