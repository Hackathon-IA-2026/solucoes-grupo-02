import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { BaseService } from '../base.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const HORA = 60 * 60 * 1000;
const VALIDADE_RESET = HORA;
const VALIDADE_CONVITE = 7 * 24 * HORA;

export interface ConviteInput {
    name: string;
    email: string;
    role?: string;
    isAdmin?: boolean;
}

@Injectable()
export class UserService extends BaseService<UserEntity> {
    constructor(
        @InjectRepository(UserEntity)
        userRepository: Repository<UserEntity>,
    ) {
        super(userRepository);
    }

    async findForAuth(id: string): Promise<Pick<UserEntity, 'id' | 'companyId' | 'isAdmin'> | null> {
        return await this.repository.findOne({ where: { id }, select: { id: true, companyId: true, isAdmin: true } });
    }

    async findWithCompany(id: string): Promise<UserEntity> {
        const user = await this.repository.findOne({ where: { id }, relations: { company: true } });
        if (!user) throw new NotFoundException(`Usuário com ID ${id} não foi encontrado.`);
        return user;
    }

    async listByCompany(companyId: string): Promise<UserEntity[]> {
        return await this.findAllInstances({ where: { companyId }, order: { createdAt: 'ASC' } });
    }

    async listActiveByCompany(companyId: string): Promise<UserEntity[]> {
        return await this.findAllInstances({ where: { companyId, invitePending: false } });
    }

    async emailExists(email: string): Promise<boolean> {
        return await this.repository.existsBy({ email });
    }

    async invite(companyId: string, input: ConviteInput): Promise<{ user: UserEntity; token: string }> {
        if (await this.emailExists(input.email)) throw new ConflictException('Já existe uma conta com esse e-mail.');

        const token = randomBytes(24).toString('hex');
        const user = await this.persist({
            name: input.name,
            email: input.email,
            role: input.role,
            companyId,
            isAdmin: input.isAdmin ?? false,
            invitePending: true,
            hashPassword: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
            resetPasswordToken: token,
            resetPasswordExpiresAt: new Date(Date.now() + VALIDADE_CONVITE),
        });
        return { user, token };
    }

    async renewInvite(companyId: string, id: string): Promise<{ user: UserEntity; token: string }> {
        const user = await this.findInCompanyOrFail(companyId, id);
        if (!user.invitePending) throw new BadRequestException('Esse usuário já criou a senha.');

        const token = randomBytes(24).toString('hex');
        await this.repository.update(user.id, { resetPasswordToken: token, resetPasswordExpiresAt: new Date(Date.now() + VALIDADE_CONVITE) });
        return { user, token };
    }

    async setAdmin(companyId: string, id: string, isAdmin: boolean): Promise<UserEntity> {
        const user = await this.findInCompanyOrFail(companyId, id);
        if (user.isAdmin && !isAdmin && (await this.countAdmins(companyId)) <= 1) {
            throw new BadRequestException('A empresa precisa de pelo menos um administrador.');
        }
        return await this.updateInstance(user.id, { isAdmin });
    }

    async removeFromCompany(companyId: string, actorId: string, id: string): Promise<void> {
        if (id === actorId) throw new BadRequestException('Você não pode remover a própria conta.');
        const user = await this.findInCompanyOrFail(companyId, id);
        await this.repository.remove(user);
    }

    async updateProfile(
        id: string,
        patch: { name?: string; role?: string; phone?: string; monthlyReportEnabled?: boolean },
    ): Promise<Omit<UserEntity, 'hashPassword'>> {
        const { phone, ...rest } = patch;
        const updated = await this.updateInstance(id, {
            ...rest,
            ...(phone !== undefined ? { phoneNumber: phone } : {}),
        });
        const { hashPassword, ...userWithoutPassword } = updated;
        return userWithoutPassword;
    }

    public async findUserToLogin(email: string): Promise<UserEntity | null> {
        const user = await this.findByEmail(email);
        if (!user) {
            console.log(`Usuário com email ${email} não foi encontrado para login.`);
            return null;
        }
        return user;
    }

    private async findByEmail(email: string): Promise<UserEntity | null> {
        const user = await this.repository.findOneBy({ email });
        if (!user) {
            console.log(`Usuário com email ${email} não foi encontrado.`);
            return null;
        }
        return user;
    }

    private async findInCompanyOrFail(companyId: string, id: string): Promise<UserEntity> {
        const user = await this.repository.findOneBy({ id, companyId });
        if (!user) throw new NotFoundException('Usuário não encontrado nesta empresa.');
        return user;
    }

    private async countAdmins(companyId: string): Promise<number> {
        return await this.repository.countBy({ companyId, isAdmin: true });
    }

    // Não lança se o e-mail não existir, para não revelar quais estão cadastrados.
    async requestPasswordReset(email: string): Promise<{ user: UserEntity; token: string } | null> {
        const user = await this.findByEmail(email);
        if (!user) return null;

        const token = randomBytes(24).toString('hex');
        const resetPasswordExpiresAt = new Date(Date.now() + VALIDADE_RESET);
        await this.repository.update(user.id, { resetPasswordToken: token, resetPasswordExpiresAt });
        return { user, token };
    }

    async resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
        const user = await this.repository.findOneBy({ resetPasswordToken: token });
        if (!user || !user.resetPasswordExpiresAt || user.resetPasswordExpiresAt.getTime() < Date.now()) {
            return false;
        }
        const hashPassword = await bcrypt.hash(newPassword, 10);
        await this.repository.update(user.id, {
            hashPassword,
            invitePending: false,
            resetPasswordToken: null,
            resetPasswordExpiresAt: null,
        } as unknown as Partial<UserEntity>);
        return true;
    }
}
