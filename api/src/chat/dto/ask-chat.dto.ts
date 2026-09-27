import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class AskChatDto {
    @IsString()
    @MinLength(1)
    question!: string;

    @IsUUID()
    @IsOptional()
    normaId?: string;
}
