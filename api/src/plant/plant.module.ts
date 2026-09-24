import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantEntity } from './entities/plant.entity';
import { PlantService } from './plant.service';
import { PlantController } from './plant.controller';

@Module({
    imports: [TypeOrmModule.forFeature([PlantEntity])],
    controllers: [PlantController],
    providers: [PlantService],
    exports: [PlantService],
})
export class PlantModule {}
