import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendEmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    attachments?: nodemailer.Attachment[];
}

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);
    private readonly transporter: nodemailer.Transporter | null = null;
    private readonly defaultFrom: string;

    constructor(private readonly config: ConfigService) {
        const host = this.config.get<string>('SMTP_HOST');
        this.defaultFrom = this.config.get<string>('SMTP_FROM', 'no-reply@energystart.app');

        if (!host) {
            this.logger.warn('SMTP_HOST não configurado. O serviço funcionará em modo MOCK (apenas logs).');
            return;
        }

        const port = this.config.get<number>('SMTP_PORT', 587);
        const secure = this.config.get<string>('SMTP_SECURE') === 'true';
        const user = this.config.get<string>('SMTP_USER');
        const pass = this.config.get<string>('SMTP_PASSWORD');

        this.transporter = nodemailer.createTransport({
            host,
            port: Number(port),
            secure,
            ...(user && pass ? { auth: { user, pass } } : {}),
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
        });
    }

    async sendEmail(options: SendEmailOptions): Promise<boolean> {
        const { to, subject, html, text, attachments } = options;
        const targetPayload = Array.isArray(to) ? to.join(', ') : to;

        if (!this.transporter) {
            this.logger.warn(
                `[MOCK EMAIL] Envio simulado com sucesso.\n` +
                    `• Para: ${targetPayload}\n` +
                    `• Assunto: ${subject}\n` +
                    `• Conteúdo (HTML): ${html.substring(0, 100)}...`,
            );
            return true;
        }

        try {
            await this.transporter.sendMail({
                from: this.defaultFrom,
                to,
                subject,
                html,
                text,
                attachments,
            });

            this.logger.log(`E-mail enviado com sucesso para: ${targetPayload} | Assunto: ${subject}`);
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Falha ao enviar e-mail para ${targetPayload}: ${message}`);
            return false;
        }
    }
}
