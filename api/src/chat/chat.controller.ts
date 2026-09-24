import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AskChatDto } from './dto/ask-chat.dto';
import { UserPayload } from '../auth/types/user.payload.type';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Post()
    async createSession(@Request() req: { user: UserPayload }) {
        const session = await this.chatService.createSession(req.user.id);
        return { id: session.id, titulo: session.titulo };
    }

    @Get()
    async listSessions(@Request() req: { user: UserPayload }) {
        const sessions = await this.chatService.listSessions(req.user.id);
        return sessions.map((s) => ({ id: s.id, titulo: s.titulo, atualizadoEm: s.updatedAt }));
    }

    @Get(':sessionId/messages')
    async listMessages(@Request() req: { user: UserPayload }, @Param('sessionId', ParseUUIDPipe) sessionId: string) {
        const mensagens = await this.chatService.listMessages(req.user.id, sessionId);
        return mensagens.map((m) => ({ id: m.id, autor: m.autor, texto: m.texto, citacoes: m.citacoes, criadoEm: m.createdAt }));
    }

    @Post(':sessionId/message')
    async sendMessage(@Request() req: { user: UserPayload }, @Param('sessionId', ParseUUIDPipe) sessionId: string, @Body() dto: AskChatDto) {
        return await this.chatService.ask(req.user.id, req.user.companyId, sessionId, dto.question);
    }
}
