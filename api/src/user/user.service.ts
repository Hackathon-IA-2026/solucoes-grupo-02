import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { GetUserDto } from './dto/get-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<GetUserDto> {
    await this.assertEmailAvailable(createUserDto.email);

    const user = this.userRepository.create({
      ...createUserDto,
      isActive: createUserDto.isActive ?? true,
    });

    return GetUserDto.fromEntity(await this.userRepository.save(user));
  }

  async findAll(): Promise<GetUserDto[]> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });

    return users.map((user) => GetUserDto.fromEntity(user));
  }

  async findOne(id: string): Promise<GetUserDto> {
    return GetUserDto.fromEntity(await this.findEntity(id));
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<GetUserDto> {
    const user = await this.findEntity(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      await this.assertEmailAvailable(updateUserDto.email);
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
    }
    return user;
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    if (await this.userRepository.existsBy({ email })) {
      throw new ConflictException('E-mail já cadastrado');
    }
  }
}
