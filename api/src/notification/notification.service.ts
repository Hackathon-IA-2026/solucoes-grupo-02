import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

// Envia e-mail de verdade se SMTP_HOST estiver configurado no .env; caso
// contrário só loga (não trava o motor de alertas/reset de senha em dev/demo
// sem credenciais configuradas). Notificação push (celular) não está aqui —
// exigiria service worker + VAPID no front, que ainda não existem no projeto.
@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);
    private readonly transporter: nodemailer.Transporter | null;

    constructor(private readonly config: ConfigService) {
        const host = this.config.get<string>('SMTP_HOST');
        this.transporter = host
            ? nodemailer.createTransport({
                  host,
                  port: Number(this.config.get<string>('SMTP_PORT', '587')),
                  secure: this.config.get<string>('SMTP_SECURE') === 'true',
                  auth: this.config.get<string>('SMTP_USER')
                      ? {
                            user: this.config.get<string>('SMTP_USER'),
                            pass: this.config.get<string>('SMTP_PASSWORD'),
                        }
                      : undefined,
              })
            : null;
    }

    async sendEmail(to: string, subject: string, html: string): Promise<void> {
        if (!this.transporter) {
            this.logger.warn(`SMTP não configurado — e-mail "${subject}" para ${to} não foi enviado (só logado).`);
            return;
        }
        const from = this.config.get<string>('SMTP_FROM', 'no-reply@energystart.app');
        try {
            await this.transporter.sendMail({ from, to, subject, html });
        } catch (err) {
            this.logger.error(`Falha ao enviar e-mail para ${to}: ${(err as Error).message}`);
        }
    }
}
