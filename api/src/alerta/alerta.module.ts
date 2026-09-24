import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertaEntity } from './entities/alerta.entity';
import { AlertaService } from './alerta.service';
import { AlertaController } from './alerta.controller';

@Module({
    imports: [TypeOrmModule.forFeature([AlertaEntity])],
    controllers: [AlertaController],
    providers: [AlertaService],
    exports: [AlertaService],
})
export class AlertaModule {}
