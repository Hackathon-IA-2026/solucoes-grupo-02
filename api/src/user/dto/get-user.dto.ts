import { UserEntity } from '../entities/user.entity';

// Resposta pública do usuário: a entity nunca sai direto pela API
// (quando entrar senha/token_reset_password, eles ficam de fora daqui).
export class GetUserDto {
  id!: string;
  name!: string;
  email!: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(user: UserEntity): GetUserDto {
    const dto = new GetUserDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.email = user.email;
    dto.isActive = user.isActive;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
