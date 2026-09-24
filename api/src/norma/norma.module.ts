import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NormaEntity } from './entities/norma.entity';
import { NormaService } from './norma.service';
import { NormaController } from './norma.controller';

@Module({
    imports: [TypeOrmModule.forFeature([NormaEntity])],
    controllers: [NormaController],
    providers: [NormaService],
    exports: [NormaService],
})
export class NormaModule {}
