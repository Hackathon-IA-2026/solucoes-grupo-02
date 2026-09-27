import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlantService } from '../plant/plant.service';
import { PlantEntity } from '../plant/entities/plant.entity';
import { LimiteService } from '../limite/limite.service';
import { LimiteEntity } from '../limite/entities/limite.entity';
import { NormaEntity } from '../norma/entities/norma.entity';
import { UserService } from '../user/user.service';
import { NotificationService } from '../notification/notification.service';
import { escapeHtml } from '../utils/texto';
import { AlertaEntity } from './entities/alerta.entity';
import { AlertaService } from './alerta.service';
import { assuntosMonitorados, citaAEmpresa } from './assuntos-monitorados';

const CAMPOS_NUMERICOS_PLANTA = ['capacityMw', 'co2', 'availability'] as const;
type CampoNumericoPlanta = (typeof CAMPOS_NUMERICOS_PLANTA)[number];

export const FREQUENCIA_IMEDIATA = 'Imediato';
export type FrequenciaResumo = 'Resumo diário' | 'Resumo semanal';

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
        private readonly config: ConfigService,
    ) {}

    async run(companyId: string): Promise<AlertaEntity[]> {
        const plant = await this.plantService.getPlant(companyId);
        const criados = await this.checarLimites(plant);
        await this.notificarAgora(plant, criados);
        return criados;
    }

    async aposIngestao(normasNovas: NormaEntity[]): Promise<AlertaEntity[]> {
        const criados: AlertaEntity[] = [];
        for (const plant of await this.plantService.listAll()) {
            const daEmpresa = [...(await this.alertarNormasNovas(plant, normasNovas)), ...(await this.checarLimites(plant))];
            await this.notificarAgora(plant, daEmpresa);
            criados.push(...daEmpresa);
        }
        return criados;
    }

    async enviarResumo(frequencia: FrequenciaResumo, desde: Date): Promise<void> {
        for (const plant of await this.plantService.listAll()) {
            if (plant.frequency !== frequencia || !plant.channels?.email) continue;

            const alertas = await this.alertaService.listSince(plant.companyId!, desde);
            if (alertas.length === 0) continue;

            const periodo = frequencia === 'Resumo diário' ? 'nas últimas 24 horas' : 'nos últimos 7 dias';
            await this.enviarEmail(
                plant.companyId!,
                alertas,
                `${frequencia}: ${alertas.length} alerta(s) regulatório(s) — Energy Start`,
                `${alertas.length} alerta(s) ${periodo}:`,
            );
        }
    }

    private async checarLimites(plant: PlantEntity): Promise<AlertaEntity[]> {
        const limites = await this.limiteService.listAll();
        const criados: AlertaEntity[] = [];
        for (const limite of limites) {
            const alerta = await this.checarLimite(plant, limite);
            if (alerta) criados.push(alerta);
        }
        return criados;
    }

    private async checarLimite(plant: PlantEntity, limite: LimiteEntity): Promise<AlertaEntity | null> {
        if (!ehCampoValido(limite.parametro)) return null;

        const valorDaUsina = plant[limite.parametro];
        if (typeof valorDaUsina !== 'number') return null;
        if (cumpre(valorDaUsina, limite.operador, limite.valor)) return null;

        const jaTemAlertaAberto = await this.alertaService.existsUnreadForLimite(plant.companyId!, limite.id);
        if (jaTemAlertaAberto) return null;

        const distanciaPct = limite.valor !== 0 ? Math.abs(((valorDaUsina - limite.valor) / limite.valor) * 100) : undefined;
        const unidade = limite.unidade ? ` ${limite.unidade}` : '';

        return await this.alertaService.create(plant.companyId!, {
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

    private async alertarNormasNovas(plant: PlantEntity, normas: NormaEntity[]): Promise<AlertaEntity[]> {
        const criados: AlertaEntity[] = [];
        for (const norma of normas) {
            const daEmpresa = citaAEmpresa(norma, plant);
            const assuntos = norma.abrangencia === 'individual' ? [] : assuntosMonitorados(norma, plant);
            if (!daEmpresa && assuntos.length === 0) continue;

            const titulo = norma.code && norma.code !== norma.title ? `${norma.code} — ${norma.title}` : norma.title;
            criados.push(
                await this.alertaService.create(plant.companyId!, {
                    normaId: norma.id,
                    tipo: daEmpresa ? 'ato_da_empresa' : 'norma_nova',
                    severidade: norma.impact,
                    titulo: daEmpresa ? 'Publicação que cita a sua empresa' : `Nova publicação em ${assuntos.join(' · ')}`,
                    mensagem: norma.deadline ? `${titulo}. ${norma.deadline}.` : `${titulo}.`,
                }),
            );
        }
        return criados;
    }

    private async notificarAgora(plant: PlantEntity, alertas: AlertaEntity[]): Promise<void> {
        if (alertas.length === 0 || !plant.channels?.email) return;
        if ((plant.frequency || FREQUENCIA_IMEDIATA) !== FREQUENCIA_IMEDIATA) return;

        const n = alertas.length;
        await this.enviarEmail(
            plant.companyId!,
            alertas,
            `${n} novo(s) alerta(s) regulatório(s) — Energy Start`,
            `${n} novo${n > 1 ? 's' : ''} alerta${n > 1 ? 's' : ''} na Central de Alertas:`,
        );
    }

    private async enviarEmail(companyId: string, alertas: AlertaEntity[], assunto: string, introducao: string): Promise<void> {
        const usuarios = await this.userService.listActiveByCompany(companyId);

        if (!usuarios || usuarios.length === 0) {
            this.logger.warn(`Nenhum usuário ativo encontrado para a empresa ${companyId}. Nenhum e-mail enviado.`);
            return;
        }

        const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:5173');
        const corpo = `<p>${escapeHtml(introducao)}</p><ul>${alertas
            .map((a) => `<li><b>${escapeHtml(a.titulo)}</b> — ${escapeHtml(a.mensagem)}</li>`)
            .join('')}</ul><p><a href="${escapeHtml(`${webUrl}/alertas`)}">Abrir a Central de Alertas</a></p>`;

        let emailsEnviadosComSucesso = 0;

        for (const usuario of usuarios) {
            const enviado = await this.notificationService.sendEmail({
                to: usuario.email,
                subject: assunto,
                html: corpo,
                text: `${introducao}\n\n${alertas.map((a) => `${a.titulo}: ${a.mensagem}`).join('\n')}\n\nAcesse: ${webUrl}/alertas`,
            });

            if (enviado) {
                emailsEnviadosComSucesso++;
            }
        }

        this.logger.log(
            `${alertas.length} alerta(s) processado(s). ` +
                `E-mails entregues com sucesso para ${emailsEnviadosComSucesso} de ${usuarios.length} usuário(s).`,
        );
    }
}
