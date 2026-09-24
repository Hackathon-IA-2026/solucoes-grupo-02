import { BaseEntity } from '../../base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ChatSessionEntity } from './chat-session.entity';

export type ChatAutor = 'user' | 'bot';

export interface ChatCitacao {
    label: string;
    excerpt: string;
    normId?: string;
}

@Entity({ name: 'chat_mensagens' })
export class ChatMessageEntity extends BaseEntity {
    @Column({ name: 'session_id', type: 'uuid' })
    sessionId!: string;

    @ManyToOne(() => ChatSessionEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_id' })
    session?: ChatSessionEntity;

    @Column({ type: 'enum', enum: ['user', 'bot'] })
    autor!: ChatAutor;

    @Column({ type: 'text' })
    texto!: string;

    @Column({ type: 'jsonb', default: '[]' })
    citacoes!: ChatCitacao[];
}
