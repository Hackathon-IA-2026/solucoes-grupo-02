import { UserEntity } from '../entities/user.entity';

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
        dto.createdAt = user.createdAt;
        dto.updatedAt = user.updatedAt;
        return dto;
    }
}
