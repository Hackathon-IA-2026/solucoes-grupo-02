import { BaseEntity } from '../../base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CompanieEntity } from '../../companie/entities/companie.entity';

@Entity({ name: 'user' })
export class UserEntity extends BaseEntity {
    @Column()
    name!: string;

    @Column({ unique: true })
    email!: string;

    @Column({ name: 'hash_password' })
    hashPassword!: string;

    @Column({ name: 'phone_number', unique: true, nullable: true })
    phoneNumber!: string;

    // Cargo da pessoa (texto livre). A permissão fica em `isAdmin`.
    @Column({ nullable: true })
    role?: string;

    // Nulo só em usuários antigos, até a migração da inicialização (CompanieMigrationService) rodar.
    @Column({ name: 'company_id', type: 'uuid', nullable: true })
    companyId?: string;

    @ManyToOne(() => CompanieEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'company_id' })
    company?: CompanieEntity;

    // Quem cadastra a empresa vira admin; admins convidam e removem usuários da mesma empresa.
    @Column({ name: 'is_admin', default: false })
    isAdmin!: boolean;

    // Convidado que ainda não abriu o link para criar a senha.
    @Column({ name: 'convite_pendente', default: false })
    invitePending!: boolean;

    @Column({ name: 'monthly_report_enabled', default: false })
    monthlyReportEnabled!: boolean;

    @Column({ name: 'reset_password_token', nullable: true })
    resetPasswordToken?: string;

    @Column({ name: 'reset_password_expires_at', type: 'timestamp', nullable: true })
    resetPasswordExpiresAt?: Date;
}
