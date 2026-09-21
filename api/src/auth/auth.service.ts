import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UserService,
        private readonly jwtService: JwtService,
    ) {}

    async generateJwtToken(userFromReq) {
        const payload: { id: string } = {
            id: userFromReq.id,
        };
        const token = this.jwtService.sign(payload);
        return { access_token: token };
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
