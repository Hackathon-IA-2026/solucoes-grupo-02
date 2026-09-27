import { applyDecorators, UseGuards } from '@nestjs/common';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { InternoKeyGuard } from './interno-key.guard';

// Escrita em dados globais (normas, trechos, limites): só o serviço Python, nunca usuários.
export const Interno = () => applyDecorators(IsPublic(), UseGuards(InternoKeyGuard));
