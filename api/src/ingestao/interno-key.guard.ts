import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { timingSafeEqual } from 'crypto';

// Protege as rotas /interno/* (chamadas pelo serviço Python, nunca pelo front).
// Em vez do JWT de usuário, exige o header `x-internal-key` igual ao INTERNAL_API_KEY
// do .env. Sem a variável configurada, as rotas ficam desligadas.
@Injectable()
export class InternoKeyGuard implements CanActivate {
    constructor(private readonly config: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        const esperada = this.config.get<string>('INTERNAL_API_KEY');
        if (!esperada) throw new ServiceUnavailableException('INTERNAL_API_KEY não configurada — rotas internas desligadas.');

        const recebida = context.switchToHttp().getRequest<Request>().header('x-internal-key') ?? '';
        const a = Buffer.from(recebida);
        const b = Buffer.from(esperada);
        if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException('Chave interna inválida.');
        return true;
    }
}
