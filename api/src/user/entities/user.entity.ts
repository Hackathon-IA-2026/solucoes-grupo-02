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

    // Cargo (texto livre); a permissão é `isAdmin`.
    @Column({ nullable: true })
    role?: string;

    @Column({ name: 'company_id', type: 'uuid', nullable: true })
    companyId?: string;

    @ManyToOne(() => CompanieEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'company_id' })
    company?: CompanieEntity;

    @Column({ name: 'is_admin', default: false })
    isAdmin!: boolean;

    @Column({ name: 'convite_pendente', default: false })
    invitePending!: boolean;

    @Column({ name: 'monthly_report_enabled', default: false })
    monthlyReportEnabled!: boolean;

    @Column({ name: 'reset_password_token', nullable: true })
    resetPasswordToken?: string;

    @Column({ name: 'reset_password_expires_at', type: 'timestamp', nullable: true })
    resetPasswordExpiresAt?: Date;
}
