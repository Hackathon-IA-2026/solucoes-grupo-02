import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MateriaDouEntity } from './entities/materia-dou.entity';
import { MateriaDouService } from './materia-dou.service';
import { MateriaDouController } from './materia-dou.controller';

@Module({
    imports: [TypeOrmModule.forFeature([MateriaDouEntity])],
    controllers: [MateriaDouController],
    providers: [MateriaDouService],
    exports: [MateriaDouService],
})
export class MateriaDouModule {}
