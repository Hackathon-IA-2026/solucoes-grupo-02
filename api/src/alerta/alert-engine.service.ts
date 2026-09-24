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
import { assuntosMonitorados } from './assuntos-monitorados';

// Cruza `limites` (regras extraídas das normas) com `configuracoes` (o perfil
// operacional da usina) e cria um `Alerta` pra cada regra descumprida — é o
// "Motor de Alertas: Cruza Lei x Perfil" do diagrama de arquitetura. Também avisa
// quando sai uma norma nova nas áreas/subáreas que a usina monitora.
const CAMPOS_NUMERICOS_PLANTA = ['capacityMw', 'co2', 'availability'] as const;
type CampoNumericoPlanta = (typeof CAMPOS_NUMERICOS_PLANTA)[number];

// Mesmos rótulos do seletor de frequência da Central de Alertas (web/src/pages/AlertsPage.tsx).
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

    // Recruza lei x perfil (o front chama depois de salvar a usina).
    async run(): Promise<AlertaEntity[]> {
        const plant = await this.plantService.getPlant();
        const criados = await this.checarLimites(plant);
        await this.notificarAgora(plant, criados);
        return criados;
    }

    // Chamado pela ingestão: avisa das normas novas nas áreas monitoradas e recruza
    // os limites, que podem ter chegado junto com elas. Um único e-mail pros dois.
    async aposIngestao(normasNovas: NormaEntity[]): Promise<AlertaEntity[]> {
        const plant = await this.plantService.getPlant();
        const criados = [...(await this.alertarNormasNovas(plant, normasNovas)), ...(await this.checarLimites(plant))];
        await this.notificarAgora(plant, criados);
        return criados;
    }

    // Disparado pelo cron (AlertDigestService) para quem escolheu resumo em vez de aviso imediato.
    async enviarResumo(frequencia: FrequenciaResumo, desde: Date): Promise<void> {
        const plant = await this.plantService.getPlant();
        if (plant.frequency !== frequencia || !plant.channels?.email) return;

        const alertas = await this.alertaService.listSince(desde);
        if (alertas.length === 0) return;

        const periodo = frequencia === 'Resumo diário' ? 'nas últimas 24 horas' : 'nos últimos 7 dias';
        await this.enviarEmail(
            alertas,
            `${frequencia}: ${alertas.length} alerta(s) regulatório(s) — Energy Start`,
            `${alertas.length} alerta(s) ${periodo}:`,
        );
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

    private async alertarNormasNovas(plant: PlantEntity, normas: NormaEntity[]): Promise<AlertaEntity[]> {
        const criados: AlertaEntity[] = [];
        for (const norma of normas) {
            const assuntos = assuntosMonitorados(norma, plant);
            if (assuntos.length === 0) continue;

            const titulo = norma.code && norma.code !== norma.title ? `${norma.code} — ${norma.title}` : norma.title;
            criados.push(
                await this.alertaService.create({
                    normaId: norma.id,
                    tipo: 'norma_nova',
                    severidade: norma.impact,
                    titulo: `Nova publicação em ${assuntos.join(' · ')}`,
                    mensagem: norma.deadline ? `${titulo}. ${norma.deadline}.` : `${titulo}.`,
                }),
            );
        }
        return criados;
    }

    // Com frequência "Resumo diário/semanal", os alertas ficam pro cron em vez de irem na hora.
    private async notificarAgora(plant: PlantEntity, alertas: AlertaEntity[]): Promise<void> {
        if (alertas.length === 0 || !plant.channels?.email) return;
        if ((plant.frequency || FREQUENCIA_IMEDIATA) !== FREQUENCIA_IMEDIATA) return;

        const n = alertas.length;
        await this.enviarEmail(
            alertas,
            `${n} novo(s) alerta(s) regulatório(s) — Energy Start`,
            `${n} novo${n > 1 ? 's' : ''} alerta${n > 1 ? 's' : ''} na Central de Alertas:`,
        );
    }

    private async enviarEmail(alertas: AlertaEntity[], assunto: string, introducao: string): Promise<void> {
        const usuarios = await this.userService.getAllUsers();
        const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:5173');
        const corpo = `<p>${escapeHtml(introducao)}</p><ul>${alertas
            .map((a) => `<li><b>${escapeHtml(a.titulo)}</b> — ${escapeHtml(a.mensagem)}</li>`)
            .join('')}</ul><p><a href="${escapeHtml(`${webUrl}/alertas`)}">Abrir a Central de Alertas</a></p>`;

        for (const usuario of usuarios) {
            await this.notificationService.sendEmail(usuario.email, assunto, corpo);
        }
        this.logger.log(`${alertas.length} alerta(s) enviado(s) por e-mail pra ${usuarios.length} usuário(s).`);
    }
}
