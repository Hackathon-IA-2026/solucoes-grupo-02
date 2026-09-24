import { IsString, MinLength } from 'class-validator';

export class AskChatDto {
    @IsString()
    @MinLength(1)
    question!: string;
}
