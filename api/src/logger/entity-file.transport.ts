// src/logger/entity-file.transport.ts
import { appendFile, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as TransportStream from 'winston-transport';

// Garante a importação correta da classe no runtime do Node.js
const Transport = require('winston-transport');

export class EntityFileTransport extends (Transport as new (opts?: TransportStream.TransportStreamOptions) => TransportStream) {
    private logsDir: string;

    constructor(opts?: TransportStream.TransportStreamOptions) {
        super(opts);
        this.logsDir = join(process.cwd(), 'logs');
        if (!existsSync(this.logsDir)) {
            mkdirSync(this.logsDir);
        }
    }

    log(info: any, callback: () => void) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        const context = info.context || 'System';

        // Extrai o prefixo da classe
        const match = context.match(/^(.+?)(Controller|Service|Repository|Module|Resolver|Gateway)$/);
        const entityName = match ? match[1].toLowerCase() : 'system';

        const logMessage = info[Symbol.for('message')] || `${info.level}: ${info.message}`;
        const filePath = join(this.logsDir, `${entityName}.txt`);

        appendFile(filePath, logMessage + '\n', (err) => {
            if (err) console.error(`Erro ao gravar log em ${filePath}`, err);
        });

        callback();
    }
}
