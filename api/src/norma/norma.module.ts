import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NormaEntity } from './entities/norma.entity';
import { NormaService } from './norma.service';
import { NormaController } from './norma.controller';
import { NormaInternoController } from './norma-interno.controller';
import { PlantModule } from '../plant/plant.module';

@Module({
    imports: [TypeOrmModule.forFeature([NormaEntity]), PlantModule],
    controllers: [NormaController, NormaInternoController],
    providers: [NormaService],
    exports: [NormaService],
})
export class NormaModule {}
