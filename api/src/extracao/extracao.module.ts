import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExtracaoEntity } from './entities/extracao.entity';
import { ExtracaoService } from './extracao.service';
import { ExtracaoController } from './extracao.controller';

@Module({
    imports: [TypeOrmModule.forFeature([ExtracaoEntity])],
    controllers: [ExtracaoController],
    providers: [ExtracaoService],
    exports: [ExtracaoService],
})
export class ExtracaoModule {}
