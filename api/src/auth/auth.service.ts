import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { UserService } from '../user/user.service';
import { NotificationService } from '../notification/notification.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../user/entities/user.entity';
import { CompanieEntity } from '../companie/entities/companie.entity';
import { PlantEntity } from '../plant/entities/plant.entity';
import { formatarCnpj, somenteDigitos } from '../utils/cnpj';
import { RegisterDto } from './dto/register.dto';

function initialsOf(name: string): string {
    return (
        name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase())
            .join('') || ''
    );
}

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UserService,
        private readonly jwtService: JwtService,
        private readonly notificationService: NotificationService,
        private readonly config: ConfigService,
        private readonly dataSource: DataSource,
    ) {}

    buildUserResponse(user: UserEntity) {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role ?? '',
            phone: user.phoneNumber ?? '',
            monthlyReportEnabled: user.monthlyReportEnabled,
            initials: initialsOf(user.name),
            isAdmin: user.isAdmin,
            company: user.company?.razaoSocial ?? '',
            cnpj: formatarCnpj(user.company?.cnpj),
        };
    }

    async me(userId: string) {
        return this.buildUserResponse(await this.usersService.findWithCompany(userId));
    }

    async buildSession(userId: string) {
        const token = this.jwtService.sign({ id: userId });
        return { token, user: await this.me(userId) };
    }

    // Cadastro inicial: cria a empresa, a configuração da usina dela e o primeiro
    // usuário (admin), tudo ou nada. Os próximos usuários entram por convite de um admin.
    async registrar(dto: RegisterDto) {
        const cnpj = somenteDigitos(dto.cnpj);
        const hashPassword = await bcrypt.hash(dto.password, 10);

        const userId = await this.dataSource.transaction(async (m) => {
            if (await m.existsBy(CompanieEntity, { cnpj })) {
                throw new ConflictException('Essa empresa já tem conta no Energy Start. Peça a um administrador dela para convidar você.');
            }
            if (await m.existsBy(UserEntity, { email: dto.email })) throw new ConflictException('Já existe uma conta com esse e-mail.');

            const empresa = await m.save(m.create(CompanieEntity, { razaoSocial: dto.companyName, cnpj }));
            await m.save(m.create(PlantEntity, { companyId: empresa.id }));
            const user = await m.save(
                m.create(UserEntity, {
                    name: dto.name,
                    email: dto.email,
                    role: dto.role,
                    phoneNumber: dto.phoneNumber,
                    hashPassword,
                    companyId: empresa.id,
                    isAdmin: true,
                }),
            );
            return user.id;
        });

        return await this.buildSession(userId);
    }

    async forgotPassword(email: string): Promise<void> {
        const result = await this.usersService.requestPasswordReset(email);
        // não revela se o e-mail existe: se não achou, só não manda nada.
        if (!result) return;

        const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:5173');
        const resetUrl = `${webUrl}/recuperar-senha?token=${result.token}`;
        await this.notificationService.sendEmail(
            result.user.email,
            'Redefinição de senha — Energy Start',
            `<p>Recebemos um pedido para redefinir a senha da sua conta.</p><p><a href="${resetUrl}">Clique aqui para criar uma senha nova</a>. O link vale por 1 hora.</p><p>Se você não pediu isso, pode ignorar este e-mail.</p>`,
        );
    }

    async validateUser(email: string, pass: string) {
        const user = await this.usersService.findUserToLogin(email);
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const isPasswordValid = await this.comparePassword(pass, user.hashPassword);
        if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

        const { id } = user;
        return { id: id };
    }

    async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
}
