import { BaseEntity } from '../../base.entity';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'user' })
export class UserEntity extends BaseEntity {
    @Column()
    name!: string;

@Index(['email'], { unique: true, where: '"deleted_at" IS NULL' })
@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
    @Column({ unique: true })
    email!: string;

    @Column({ name: 'hash_password' })
    hashPassword!: string;
}
