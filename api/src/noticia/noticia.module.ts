import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoticiaEntity } from './entities/noticia.entity';
import { NoticiaService } from './noticia.service';
import { NoticiaController } from './noticia.controller';

@Module({
    imports: [TypeOrmModule.forFeature([NoticiaEntity])],
    controllers: [NoticiaController],
    providers: [NoticiaService],
    exports: [NoticiaService],
})
export class NoticiaModule {}
