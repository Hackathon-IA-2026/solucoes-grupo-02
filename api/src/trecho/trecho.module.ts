import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrechoEntity } from './entities/trecho.entity';
import { TrechoService } from './trecho.service';
import { TrechoController } from './trecho.controller';
import { TrechoInternoController } from './trecho-interno.controller';
import { NormaModule } from '../norma/norma.module';

@Module({
    imports: [TypeOrmModule.forFeature([TrechoEntity]), NormaModule],
    controllers: [TrechoController, TrechoInternoController],
    providers: [TrechoService],
    exports: [TrechoService],
})
export class TrechoModule {}
