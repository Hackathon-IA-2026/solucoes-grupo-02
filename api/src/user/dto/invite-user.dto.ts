import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class InviteUserDto {
    @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name!: string;

    @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    @IsEmail()
    @MaxLength(255)
    email!: string;

    @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsOptional()
    @MaxLength(255)
    role?: string;

    @IsBoolean()
    @IsOptional()
    isAdmin?: boolean;
}
