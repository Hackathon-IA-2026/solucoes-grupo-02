import { Module } from '@nestjs/common';
import { AlertaModule } from '../alerta/alerta.module';
import { TrechoModule } from '../trecho/trecho.module';
import { IngestaoController } from './ingestao.controller';
import { IngestaoService } from './ingestao.service';

@Module({
    imports: [AlertaModule, TrechoModule],
    controllers: [IngestaoController],
    providers: [IngestaoService],
})
export class IngestaoModule {}
