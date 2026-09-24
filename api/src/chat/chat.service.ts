import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSessionEntity } from './entities/chat-session.entity';
import { ChatMessageEntity } from './entities/chat-message.entity';
import { CopilotService } from '../copilot/copilot.service';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(ChatSessionEntity) private readonly sessionRepo: Repository<ChatSessionEntity>,
        @InjectRepository(ChatMessageEntity) private readonly messageRepo: Repository<ChatMessageEntity>,
        private readonly copilotService: CopilotService,
    ) {}

    async createSession(userId: string): Promise<ChatSessionEntity> {
        return await this.sessionRepo.save(this.sessionRepo.create({ userId, titulo: 'Nova conversa' }));
    }

    async listSessions(userId: string): Promise<ChatSessionEntity[]> {
        return await this.sessionRepo.find({ where: { userId }, order: { updatedAt: 'DESC' } });
    }

    async listMessages(userId: string, sessionId: string): Promise<ChatMessageEntity[]> {
        await this.getSessionOrFail(userId, sessionId);
        return await this.messageRepo.find({ where: { sessionId }, order: { createdAt: 'ASC' } });
    }

    async ask(userId: string, sessionId: string, question: string) {
        const session = await this.getSessionOrFail(userId, sessionId);

        await this.messageRepo.save(this.messageRepo.create({ sessionId: session.id, autor: 'user', texto: question, citacoes: [] }));

        const resposta = await this.copilotService.ask(question);

        await this.messageRepo.save(
            this.messageRepo.create({ sessionId: session.id, autor: 'bot', texto: resposta.answer, citacoes: resposta.citations }),
        );

        if (session.titulo === 'Nova conversa') {
            session.titulo = question.length > 60 ? `${question.slice(0, 57)}…` : question;
        }
        await this.sessionRepo.save(session); // também atualiza `updatedAt`, pra ordenar a lista de conversas

        return { sessionId: session.id, answer: resposta.answer, citations: resposta.citations };
    }

    private async getSessionOrFail(userId: string, sessionId: string): Promise<ChatSessionEntity> {
        const session = await this.sessionRepo.findOneBy({ id: sessionId });
        if (!session) throw new NotFoundException('Conversa não encontrada.');
        if (session.userId !== userId) throw new ForbiddenException('Essa conversa não é sua.');
        return session;
    }
}
