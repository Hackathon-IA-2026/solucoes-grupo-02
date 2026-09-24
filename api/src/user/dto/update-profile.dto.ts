import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
    @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsOptional()
    @MaxLength(255)
    name?: string;

    @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsOptional()
    @MaxLength(255)
    role?: string;

    @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsOptional()
    @MaxLength(20)
    phone?: string;

    @IsBoolean()
    @IsOptional()
    monthlyReportEnabled?: boolean;
}
