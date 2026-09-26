import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join, resolve } from 'path';
import * as winston from 'winston';
import { WinstonModule, utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { AppModule } from './app.module';
import { EntityFileTransport } from './logger/entity-file.transport';

async function bootstrap() {
    const textFormat = winston.format.printf(({ level, message, timestamp, context }) => {
        return `[${timestamp}] [${context || 'System'}] ${level.toUpperCase()}: ${message}`;
    });

    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        bufferLogs: true,
    });

    const configService = app.get(ConfigService);

    const logLevelConsole = configService.get<string>('LOG_LEVEL_CONSOLE', 'debug');
    const logLevelFile = configService.get<string>('LOG_LEVEL_FILE', 'info');

    app.useLogger(
        WinstonModule.createLogger({
            transports: [
                new winston.transports.Console({
                    level: logLevelConsole,
                    format: winston.format.combine(
                        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                        nestWinstonModuleUtilities.format.nestLike('NestAPI', {
                            colors: true,
                            prettyPrint: true,
                        }),
                    ),
                }),
                new EntityFileTransport({
                    level: logLevelFile,
                    format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), textFormat),
                }),
            ],
        }),
    );

    const httpLogger = new Logger('HTTP');

    app.useBodyParser('json', { limit: '20mb' });

    const webDir = configService.get<string>('WEB_DIST_DIR');
    if (webDir) {
        app.setGlobalPrefix('api');
        app.useStaticAssets(resolve(webDir));
        app.use((req, res, next) => {
            if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
            res.sendFile(join(resolve(webDir), 'index.html'));
        });
    }

    app.enableCors({
        origin: configService.get<string>('CORS_ORIGIN')?.split(',') ?? 'http://localhost:5173',
        credentials: true,
    });

    app.use((req, res, next) => {
        httpLogger.log(`${req.method} ${req.originalUrl}`);
        next();
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    const port = configService.get<number>('PORT', 3000);
    await app.listen(port);
}
bootstrap();
