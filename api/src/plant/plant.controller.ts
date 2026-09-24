import { Body, Controller, Get, Put } from '@nestjs/common';
import { PlantService, toPlantResponse } from './plant.service';
import { UpdatePlantDto } from './dto/update-plant.dto';

@Controller('plants')
export class PlantController {
    constructor(private readonly plantService: PlantService) {}

    @Get('me')
    async getPlant() {
        return toPlantResponse(await this.plantService.getPlant());
    }

    @Put('me')
    async updatePlant(@Body() dto: UpdatePlantDto) {
        return toPlantResponse(await this.plantService.updatePlant(dto));
    }
}
