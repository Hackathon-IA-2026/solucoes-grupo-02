import { BaseEntity } from '../../base.entity';
import { Column, Entity } from 'typeorm';

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
    @Column({ nullable: true })
    role?: string;

    @Column({ name: 'monthly_report_enabled', default: false })
    monthlyReportEnabled!: boolean;

    @Column({ name: 'reset_password_token', nullable: true })
    resetPasswordToken?: string;

    @Column({ name: 'reset_password_expires_at', type: 'timestamp', nullable: true })
    resetPasswordExpiresAt?: Date;
}
