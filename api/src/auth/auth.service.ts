import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { CompanieService } from '../companie/companie.service';
import { NotificationService } from '../notification/notification.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../user/entities/user.entity';

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
        private readonly companieService: CompanieService,
        private readonly notificationService: NotificationService,
        private readonly config: ConfigService,
    ) {}

    buildUserResponse(user: Omit<UserEntity, 'hashPassword'>) {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role ?? '',
            phone: user.phoneNumber ?? '',
            monthlyReportEnabled: user.monthlyReportEnabled,
            initials: initialsOf(user.name),
            ...this.companieService.getCompanie(),
        };
    }

    async buildSession(userId: string) {
        const user = await this.usersService.findUserById(userId);
        const token = this.jwtService.sign({ id: userId });
        return { token, user: this.buildUserResponse(user) };
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
