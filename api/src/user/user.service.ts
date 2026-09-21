import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { BaseService } from '../base.service';

@Injectable()
export class UserService extends BaseService<UserEntity> {
    constructor(
        @InjectRepository(UserEntity)
        userRepository: Repository<UserEntity>,
    ) {
        super(userRepository);
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
