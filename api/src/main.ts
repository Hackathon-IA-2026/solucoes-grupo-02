import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join, resolve } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // No deploy (ver infra/), a API também serve o build do web na mesma URL.
    // As rotas da API vão para /api porque o front tem rotas com o mesmo nome (ex.: /noticias).
    const webDir = process.env.WEB_DIST_DIR;
    if (webDir) {
        app.setGlobalPrefix('api');
        app.useStaticAssets(resolve(webDir));
        app.use((req, res, next) => {
            if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
            res.sendFile(join(resolve(webDir), 'index.html'));
        });
    }

    app.enableCors({
        origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:5173',
        credentials: true,
    });
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.originalUrl}`);
        next();
    });
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
