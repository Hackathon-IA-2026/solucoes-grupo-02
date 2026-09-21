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

    this.userRepository.merge(user, updateUserDto);

    return GetUserDto.fromEntity(await this.userRepository.save(user));
  }

  async remove(id: string): Promise<void> {
    const user = await this.findEntity(id);
    await this.userRepository.softRemove(user);
  }

  private async findEntity(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
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
