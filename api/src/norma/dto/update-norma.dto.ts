import { PartialType } from '@nestjs/mapped-types';
import { CreateNormaDto } from './create-norma.dto';

export class UpdateNormaDto extends PartialType(CreateNormaDto) {}
