import { Body, Controller, Get, Put, Query, Request } from '@nestjs/common';
import { UserPayload } from '../auth/types/user.payload.type';
import { Interno } from '../ingestao/interno.decorator';
import { TAXONOMIA } from '../alerta/taxonomia';
import { cnpjValido, somenteDigitos } from '../utils/cnpj';
import { PlantService, toPlantResponse } from './plant.service';
import { UsinasAneelService } from './usinas-aneel.service';
import { UpdatePlantDto } from './dto/update-plant.dto';

@Controller('plants')
export class PlantController {
    constructor(
        private readonly plantService: PlantService,
        private readonly usinasAneel: UsinasAneelService,
    ) {}

    @Get('taxonomia')
    taxonomia() {
        return TAXONOMIA;
    }

    @Get('me')
    async getPlant(@Request() req: { user: UserPayload }) {
        return toPlantResponse(await this.plantService.getPlant(req.user.companyId));
    }

    @Put('me')
    async updatePlant(@Request() req: { user: UserPayload }, @Body() dto: UpdatePlantDto) {
        return toPlantResponse(await this.plantService.updatePlant(req.user.companyId, dto));
    }

    @Get('me/usinas-aneel')
    async usinasNaAneel(@Request() req: { user: UserPayload }, @Query('cnpjs') cnpjs?: string) {
        const plant = await this.plantService.getPlant(req.user.companyId);
        const informados = (cnpjs ?? '').split(',').map(somenteDigitos).filter(cnpjValido).slice(0, 50);
        return await this.usinasAneel.porCnpjs([plant.company?.cnpj, ...(plant.cnpjs ?? []), ...informados].filter((c): c is string => Boolean(c)));
    }
}

@Interno()
@Controller('interno/clientes')
export class PlantInternoController {
    constructor(private readonly plantService: PlantService) {}

    @Get('identificadores')
    async identificadores() {
        return await this.plantService.identificadoresDosClientes();
    }
}
