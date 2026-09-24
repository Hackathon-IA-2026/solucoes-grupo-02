import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrechoEntity } from './entities/trecho.entity';
import { TrechoService } from './trecho.service';
import { TrechoController } from './trecho.controller';

@Module({
    imports: [TypeOrmModule.forFeature([TrechoEntity])],
    controllers: [TrechoController],
    providers: [TrechoService],
    exports: [TrechoService],
})
export class TrechoModule {}
