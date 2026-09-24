import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUserDto {
    @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name!: string;

    @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(255)
    email!: string;

    @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    password!: string;

    @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsOptional()
    @MaxLength(20)
    @IsString()
    phoneNumber?: string;

    @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsOptional()
    @MaxLength(255)
    role?: string;
}
