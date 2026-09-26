import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class AskChatDto {
    @IsString()
    @MinLength(1)
    question!: string;

    // A norma de que o usuário está falando (o botão "perguntar ao copiloto" dos Resumos e do Painel)
    @IsUUID()
    @IsOptional()
    normaId?: string;
}
