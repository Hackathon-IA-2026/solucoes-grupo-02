import { PartialType } from '@nestjs/mapped-types';
import { CreateLimiteDto } from './create-limite.dto';

export class UpdateLimiteDto extends PartialType(CreateLimiteDto) {}
