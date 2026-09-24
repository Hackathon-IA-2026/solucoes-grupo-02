import { Module } from '@nestjs/common';
import { AlertaModule } from '../alerta/alerta.module';
import { IngestaoController } from './ingestao.controller';
import { IngestaoService } from './ingestao.service';

@Module({
    imports: [AlertaModule],
    controllers: [IngestaoController],
    providers: [IngestaoService],
})
export class IngestaoModule {}
