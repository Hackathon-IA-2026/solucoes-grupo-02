import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { UserModule } from './user/user.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { resolve } from 'path';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PlantModule } from './plant/plant.module';
import { TrechoModule } from './trecho/trecho.module';
import { NormaModule } from './norma/norma.module';
import { MateriaDouModule } from './materia-dou/materia-dou.module';
import { ExtracaoModule } from './extracao/extracao.module';
import { LimiteModule } from './limite/limite.module';
import { AlertaModule } from './alerta/alerta.module';
import { CopilotModule } from './copilot/copilot.module';
import { NoticiaModule } from './noticia/noticia.module';
import { ChatModule } from './chat/chat.module';
import { IngestaoModule } from './ingestao/ingestao.module';
import { CompanieModule } from './companie/companie.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: resolve(__dirname, '../../.env'),
        }),
        ScheduleModule.forRoot(),
        DatabaseModule,
        CompanieModule,
        AuthModule,
        UserModule,
        PlantModule,
        TrechoModule,
        NormaModule,
        MateriaDouModule,
        ExtracaoModule,
        LimiteModule,
        AlertaModule,
        CopilotModule,
        NoticiaModule,
        ChatModule,
        IngestaoModule,
    ],
    controllers: [AppController],
    providers: [
        {
            provide: 'APP_GUARD',
            useClass: JwtAuthGuard,
        },
        UserModule,
    ],
})
export class AppModule {}
