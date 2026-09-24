import { BaseEntity } from '../../base.entity';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'chat_sessions' })
export class ChatSessionEntity extends BaseEntity {
    @Column({ name: 'user_id', type: 'uuid' })
    userId!: string;

    @Column({ default: 'Nova conversa' })
    titulo!: string;
}
