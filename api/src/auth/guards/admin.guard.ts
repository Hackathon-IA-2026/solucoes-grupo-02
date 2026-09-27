import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserPayload } from '../types/user.payload.type';

@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const user = context.switchToHttp().getRequest<{ user?: UserPayload }>().user;
        if (!user?.isAdmin) throw new ForbiddenException('Apenas administradores da empresa podem fazer isso.');
        return true;
    }
}
