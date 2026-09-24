import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { BaseService } from '../base.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
@Injectable()
export class UserService extends BaseService<UserEntity> {
    constructor(
        @InjectRepository(UserEntity)
        userRepository: Repository<UserEntity>,
    ) {
        super(userRepository);
    }
    async createUser(req: CreateUserDto): Promise<UserEntity> {
        const existingUser = await this.findByEmail(req.email);
        if (existingUser) {
            Promise.resolve(false);
            throw new UnauthorizedException(`Usuário com email ${req.email} já existe.`);
        }
        let user = new UserEntity();
        user.name = req.name;
        user.email = req.email;
        user.role = req.role;
        if (req.phoneNumber) {
            user.phoneNumber = req.phoneNumber;
        }
        user.hashPassword = await bcrypt.hash(req.password, 10);

        user = await this.persist(user);

        const { hashPassword, ...userWithoutPassword } = user;
        return userWithoutPassword as UserEntity;
    }

    getAllUsers() {
        return this.findAllInstances();
    }

    async findUserById(id: string): Promise<Omit<UserEntity, 'hashPassword'>> {
        const user = await this.findInstanceById(id);
        if (!user) {
            throw new NotFoundException(`Usuário com ID ${id} não foi encontrado.`);
        }
        const { hashPassword, ...userWithoutPassword } = user;

        return userWithoutPassword;
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

    async deleteUserById(id: string): Promise<void> {
        const user = await this.findInstanceById(id);
        if (!user) {
            throw new NotFoundException(`Usuário com ID ${id} não foi encontrado.`);
        }
        await this.deleteInstanceById(id);
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

    // Não lança se o e-mail não existir — quem chama isso não deve vazar pro
    // cliente se um e-mail está cadastrado ou não.
    async requestPasswordReset(email: string): Promise<{ user: UserEntity; token: string } | null> {
        const user = await this.findByEmail(email);
        if (!user) return null;

        const token = randomBytes(24).toString('hex');
        const resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
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
            resetPasswordToken: null,
            resetPasswordExpiresAt: null,
        } as unknown as Partial<UserEntity>);
        return true;
    }
}
