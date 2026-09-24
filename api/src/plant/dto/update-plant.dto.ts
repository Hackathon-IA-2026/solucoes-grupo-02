import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

class PlantChannelsDto {
    @IsBoolean()
    @IsOptional()
    email?: boolean;

    @IsBoolean()
    @IsOptional()
    push?: boolean;

    @IsBoolean()
    @IsOptional()
    pdf?: boolean;
}

export class UpdatePlantDto {
    @IsUUID()
    @IsOptional()
    id?: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    kind?: string;

    @IsString()
    @IsOptional()
    submarket?: string;

    @IsString()
    @IsOptional()
    contractEnv?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    capacityMw?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    capacityLimitMw?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    co2?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    co2Limit?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    availability?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    availabilityMin?: number;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    areas?: string[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    subareas?: string[];

    @ValidateNested()
    @Type(() => PlantChannelsDto)
    @IsOptional()
    channels?: PlantChannelsDto;

    @IsString()
    @IsOptional()
    frequency?: string;

    @IsDateString()
    @IsOptional()
    protocolDate?: string;

    @IsString()
    @IsOptional()
    distributor?: string;

    @IsBoolean()
    @IsOptional()
    hasStorage?: boolean;

    @IsNumber()
    @Min(0)
    @IsOptional()
    majorHolderSharePct?: number;
}
