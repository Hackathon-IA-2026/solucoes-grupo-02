import { Injectable, Logger } from '@nestjs/common';
import { PlantService } from '../plant/plant.service';
import { PlantEntity } from '../plant/entities/plant.entity';
import { LimiteService } from '../limite/limite.service';
import { LimiteEntity } from '../limite/entities/limite.entity';
import { UserService } from '../user/user.service';
import { NotificationService } from '../notification/notification.service';
import { AlertaEntity } from './entities/alerta.entity';
import { AlertaService } from './alerta.service';

// Cruza `limites` (regras extraídas das normas) com `configuracoes` (o perfil
// operacional da usina) e cria um `Alerta` pra cada regra descumprida — é o
// "Motor de Alertas: Cruza Lei x Perfil" do diagrama de arquitetura.
const CAMPOS_NUMERICOS_PLANTA = ['capacityMw', 'co2', 'availability'] as const;
type CampoNumericoPlanta = (typeof CAMPOS_NUMERICOS_PLANTA)[number];

function ehCampoValido(parametro: string): parametro is CampoNumericoPlanta {
    return (CAMPOS_NUMERICOS_PLANTA as readonly string[]).includes(parametro);
}

function cumpre(valor: number, operador: string, limite: number): boolean {
    switch (operador) {
        case '>':
            return valor > limite;
        case '<':
            return valor < limite;
        case '>=':
            return valor >= limite;
        case '<=':
            return valor <= limite;
        case '=':
            return valor === limite;
        default:
            return true;
    }
}

@Injectable()
export class AlertEngineService {
    private readonly logger = new Logger(AlertEngineService.name);

    constructor(
        private readonly plantService: PlantService,
        private readonly limiteService: LimiteService,
        private readonly alertaService: AlertaService,
        private readonly userService: UserService,
        private readonly notificationService: NotificationService,
    ) {}

    async run(): Promise<AlertaEntity[]> {
        const plant = await this.plantService.getPlant();
        const limites = await this.limiteService.listAll();

        const criados: AlertaEntity[] = [];
        for (const limite of limites) {
            const alerta = await this.checarLimite(plant, limite);
            if (alerta) criados.push(alerta);
        }

        if (criados.length > 0 && plant.channels?.email) {
            await this.notificarUsuarios(criados);
        }

        return criados;
    }

    private async checarLimite(plant: PlantEntity, limite: LimiteEntity): Promise<AlertaEntity | null> {
        if (!ehCampoValido(limite.parametro)) return null;

        const valorDaUsina = plant[limite.parametro];
        if (typeof valorDaUsina !== 'number') return null;
        if (cumpre(valorDaUsina, limite.operador, limite.valor)) return null;

        const jaTemAlertaAberto = await this.alertaService.existsUnreadForLimite(limite.id);
        if (jaTemAlertaAberto) return null;

        const distanciaPct = limite.valor !== 0 ? Math.abs(((valorDaUsina - limite.valor) / limite.valor) * 100) : undefined;
        const unidade = limite.unidade ? ` ${limite.unidade}` : '';

        return await this.alertaService.create({
            limiteId: limite.id,
            normaId: limite.normaId,
            tipo: 'limite_excedido',
            severidade: 'alto',
            titulo: `${limite.parametro} fora do limite regulatório`,
            mensagem: `Valor atual (${valorDaUsina}${unidade}) não cumpre a regra "${limite.parametro} ${limite.operador} ${limite.valor}${unidade}"${limite.artigo ? `, conforme ${limite.artigo}` : ''}.`,
            valorDaUsina,
            valorDoLimite: limite.valor,
            distanciaPct,
        });
    }

    private async notificarUsuarios(alertas: AlertaEntity[]): Promise<void> {
        const usuarios = await this.userService.getAllUsers();
        const corpo = `<p>${alertas.length} novo${alertas.length > 1 ? 's' : ''} alerta${alertas.length > 1 ? 's' : ''} na Central de Alertas:</p><ul>${alertas
            .map((a) => `<li><b>${a.titulo}</b> — ${a.mensagem}</li>`)
            .join('')}</ul>`;

        for (const usuario of usuarios) {
            await this.notificationService.sendEmail(usuario.email, `${alertas.length} novo(s) alerta(s) regulatório(s) — Energy Start`, corpo);
        }
        this.logger.log(`${alertas.length} alerta(s) criado(s), e-mail disparado pra ${usuarios.length} usuário(s).`);
    }
}
