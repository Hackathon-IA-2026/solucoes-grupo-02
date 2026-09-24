import { ArrayMaxSize, IsArray, IsObject } from 'class-validator';

// Cada item é uma linha do DataFrame final do pipeline Python, sem validação aninhada
// de propósito: as colunas mudam conforme o modelo evolui e o `ingestao.mapper.ts`
// já lê cada campo de forma defensiva (colunas extras são ignoradas).
export class IngestaoDto {
    @IsArray()
    @ArrayMaxSize(500)
    @IsObject({ each: true })
    normas!: Record<string, unknown>[];
}
