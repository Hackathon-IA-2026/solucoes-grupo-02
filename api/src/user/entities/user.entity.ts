import { BaseEntity } from '../../base.entity';
import { Column, Entity, Index } from 'typeorm';

@Index(['email'], { unique: true, where: '"deleted_at" IS NULL' })
@Entity({ name: 'user' })
export class UserEntity extends BaseEntity {
    @Column()
    name!: string;

    @Column({ unique: true })
    email!: string;

    @Column({ name: 'hash_password' })
    hashPassword!: string;
}
