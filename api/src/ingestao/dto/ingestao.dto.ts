import { ArrayMaxSize, IsArray, IsObject } from 'class-validator';

export class IngestaoDto {
    @IsArray()
    @ArrayMaxSize(500)
    @IsObject({ each: true })
    normas!: Record<string, unknown>[];
}
