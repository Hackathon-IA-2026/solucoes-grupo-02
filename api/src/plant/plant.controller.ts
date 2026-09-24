import { Body, Controller, Get, Put, Request } from '@nestjs/common';
import { UserPayload } from '../auth/types/user.payload.type';
import { PlantService, toPlantResponse } from './plant.service';
import { UpdatePlantDto } from './dto/update-plant.dto';

@Controller('plants')
export class PlantController {
    constructor(private readonly plantService: PlantService) {}

    @Get('me')
    async getPlant(@Request() req: { user: UserPayload }) {
        return toPlantResponse(await this.plantService.getPlant(req.user.companyId));
    }

    @Put('me')
    async updatePlant(@Request() req: { user: UserPayload }, @Body() dto: UpdatePlantDto) {
        return toPlantResponse(await this.plantService.updatePlant(req.user.companyId, dto));
    }
}
