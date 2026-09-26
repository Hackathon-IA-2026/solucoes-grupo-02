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

    // Áreas e subáreas que a Central de Alertas oferece (as que o classificador conhece).
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

    // Usinas da empresa no cadastro da ANEEL (pelo CNPJ dela e das SPEs), para o usuário escolher
    // quais CEGs monitorar. `cnpjs` (separados por vírgula) traz SPEs digitadas e ainda não salvas —
    // o cadastro da ANEEL é público, então não há o que proteger.
    @Get('me/usinas-aneel')
    async usinasNaAneel(@Request() req: { user: UserPayload }, @Query('cnpjs') cnpjs?: string) {
        const plant = await this.plantService.getPlant(req.user.companyId);
        const informados = (cnpjs ?? '').split(',').map(somenteDigitos).filter(cnpjValido).slice(0, 50);
        return await this.usinasAneel.porCnpjs([plant.company?.cnpj, ...(plant.cnpjs ?? []), ...informados].filter((c): c is string => Boolean(c)));
    }
}

// Para o pipeline Python: com isso ele descarta, antes do resumidor, os atos individuais
// (despacho sobre uma usina, multa...) que não citam nenhum cliente.
@Interno()
@Controller('interno/clientes')
export class PlantInternoController {
    constructor(private readonly plantService: PlantService) {}

    @Get('identificadores')
    async identificadores() {
        return await this.plantService.identificadoresDosClientes();
    }
}
