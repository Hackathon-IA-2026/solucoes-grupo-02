import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserPayload } from '../types/user.payload.type';
import { UserService } from '../../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly userService: UserService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET,
        });
    }

    // Relê o usuário a cada requisição para que remoção e troca de permissão valham na hora.
    async validate(payload: { id: string }): Promise<UserPayload> {
        const user = await this.userService.findForAuth(payload.id);
        if (!user?.companyId) throw new UnauthorizedException('Sessão inválida. Entre novamente.');
        return { id: user.id, companyId: user.companyId, isAdmin: user.isAdmin };
    }
}
