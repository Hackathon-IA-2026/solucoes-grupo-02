import { applyDecorators, UseGuards } from '@nestjs/common';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { InternoKeyGuard } from './interno-key.guard';

// Rota só para o serviço Python (header `x-internal-key`), nunca para usuários.
// Vale para toda escrita em dado global — normas, trechos, limites... —, que é
// compartilhado por todas as empresas: um usuário qualquer não pode criar, alterar
// ou apagar esses registros (um limite falso, por exemplo, geraria alerta para todos).
export const Interno = () => applyDecorators(IsPublic(), UseGuards(InternoKeyGuard));
