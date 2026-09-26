import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoticiaEntity } from './entities/noticia.entity';
import { NoticiaService } from './noticia.service';
import { NoticiaController } from './noticia.controller';
import { NoticiaColetorService } from './coletor.service';
import { PlantModule } from '../plant/plant.module';

@Module({
    imports: [TypeOrmModule.forFeature([NoticiaEntity]), PlantModule],
    controllers: [NoticiaController],
    providers: [NoticiaService, NoticiaColetorService],
    exports: [NoticiaService],
})
export class NoticiaModule {}
