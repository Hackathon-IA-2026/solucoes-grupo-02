import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { CompanieService } from '../companie/companie.service';
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
    ) {}

    buildUserResponse(user: Omit<UserEntity, 'hashPassword'>) {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role ?? '',
            phone: '',
            initials: initialsOf(user.name),
            ...this.companieService.getCompanie(),
        };
    }

    async buildSession(userId: string) {
        const user = await this.usersService.findUserById(userId);
        const token = this.jwtService.sign({ id: userId });
        return { token, user: this.buildUserResponse(user) };
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
