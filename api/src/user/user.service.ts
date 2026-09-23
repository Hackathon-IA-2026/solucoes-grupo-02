import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { BaseService } from '../base.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
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
}
