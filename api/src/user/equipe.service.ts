import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../notification/notification.service';
import { escapeHtml } from '../utils/texto';
import { UserPayload } from '../auth/types/user.payload.type';
import { UserEntity } from './entities/user.entity';
import { ConviteInput, UserService } from './user.service';

export function toMemberResponse(user: UserEntity) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role ?? '',
        isAdmin: user.isAdmin,
        convitePendente: user.invitePending,
        desde: user.createdAt,
    };
}

@Injectable()
export class EquipeService {
    constructor(
        private readonly userService: UserService,
        private readonly notificationService: NotificationService,
        private readonly config: ConfigService,
    ) {}

    async listar(ator: UserPayload) {
        const membros = await this.userService.listByCompany(ator.companyId);
        return membros.map(toMemberResponse);
    }

    async convidar(ator: UserPayload, input: ConviteInput) {
        const { user, token } = await this.userService.invite(ator.companyId, input);
        const linkConvite = await this.enviarConvite(ator, user, token);
        return { membro: toMemberResponse(user), linkConvite };
    }

    async renovarConvite(ator: UserPayload, id: string) {
        const { user, token } = await this.userService.renewInvite(ator.companyId, id);
        const linkConvite = await this.enviarConvite(ator, user, token);
        return { membro: toMemberResponse(user), linkConvite };
    }

    async alterarAdmin(ator: UserPayload, id: string, isAdmin: boolean) {
        return toMemberResponse(await this.userService.setAdmin(ator.companyId, id, isAdmin));
    }

    async remover(ator: UserPayload, id: string) {
        await this.userService.removeFromCompany(ator.companyId, ator.id, id);
    }

    private async enviarConvite(ator: UserPayload, convidado: UserEntity, token: string): Promise<string> {
        const quemConvida = await this.userService.findWithCompany(ator.id);
        const empresa = quemConvida.company?.razaoSocial ?? 'sua empresa';
        const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:5173');
        const link = `${webUrl}/recuperar-senha?token=${token}&convite=1`;

        const assunto = `Convite para a conta da ${empresa} no Energy Start`;
        const htmlCorpo =
            `<p>${escapeHtml(quemConvida.name)} convidou você para acessar a conta da <b>${escapeHtml(empresa)}</b> no Energy Start.</p>` +
            `<p><a href="${escapeHtml(link)}">Clique aqui para criar sua senha</a>. O link vale por 7 dias.</p>`;

        await this.notificationService.sendEmail({
            to: convidado.email,
            subject: assunto,
            html: htmlCorpo,
            text:
                `${quemConvida.name} convidou você para acessar a conta da ${empresa} no Energy Start.\n\n` +
                `Acesse o link a seguir para criar sua senha (válido por 7 dias):\n${link}`,
        });

        return link;
    }
}
