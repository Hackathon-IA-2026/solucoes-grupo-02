import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertaEntity } from './entities/alerta.entity';
import { AlertaService } from './alerta.service';
import { AlertaController } from './alerta.controller';
import { AlertEngineService } from './alert-engine.service';
import { PlantModule } from '../plant/plant.module';
import { LimiteModule } from '../limite/limite.module';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [TypeOrmModule.forFeature([AlertaEntity]), PlantModule, LimiteModule, UserModule, NotificationModule],
    controllers: [AlertaController],
    providers: [AlertaService, AlertEngineService],
    exports: [AlertaService, AlertEngineService],
})
export class AlertaModule {}
