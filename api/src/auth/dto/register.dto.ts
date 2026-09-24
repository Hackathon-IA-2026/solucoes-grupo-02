import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { IsCnpj } from '../../utils/cnpj';

// Cadastro inicial: cria a empresa e o primeiro usuário, que vira o admin dela.
export class RegisterDto extends CreateUserDto {
    @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    companyName!: string;

    @IsString()
    @IsCnpj()
    cnpj!: string;
}
