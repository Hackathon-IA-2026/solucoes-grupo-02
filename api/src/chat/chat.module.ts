import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSessionEntity } from './entities/chat-session.entity';
import { ChatMessageEntity } from './entities/chat-message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { CopilotModule } from '../copilot/copilot.module';

@Module({
    imports: [TypeOrmModule.forFeature([ChatSessionEntity, ChatMessageEntity]), CopilotModule],
    controllers: [ChatController],
    providers: [ChatService],
})
export class ChatModule {}
