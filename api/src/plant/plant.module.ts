import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantEntity } from './entities/plant.entity';
import { PlantService } from './plant.service';
import { UsinasAneelService } from './usinas-aneel.service';
import { PlantController, PlantInternoController } from './plant.controller';

@Module({
    imports: [TypeOrmModule.forFeature([PlantEntity])],
    controllers: [PlantController, PlantInternoController],
    providers: [PlantService, UsinasAneelService],
    exports: [PlantService],
})
export class PlantModule {}
