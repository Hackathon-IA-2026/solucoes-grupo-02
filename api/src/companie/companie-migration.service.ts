import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, IsNull } from 'typeorm';
import { UserEntity } from '../user/entities/user.entity';
import { PlantEntity } from '../plant/entities/plant.entity';
import { AlertaEntity } from '../alerta/entities/alerta.entity';
import { cnpjValido, somenteDigitos } from '../utils/cnpj';
import { CompanieEntity } from './entities/companie.entity';

// Antes do cadastro por empresa, cada banco era de uma empresa só (COMPANY_NAME e
// COMPANY_CNPJ no .env). Na inicialização, se ainda houver usuários, usina ou
// alertas sem empresa, cria essa empresa a partir do .env e liga tudo a ela — o
// usuário mais antigo vira admin. Depois da primeira vez, não faz nada.
@Injectable()
export class CompanieMigrationService implements OnApplicationBootstrap {
    private readonly logger = new Logger(CompanieMigrationService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly config: ConfigService,
    ) {}

    async onApplicationBootstrap() {
        await this.dataSource.transaction(async (m) => {
            const usuarios = await m.find(UserEntity, { where: { companyId: IsNull() }, order: { createdAt: 'ASC' } });
            const usinas = await m.find(PlantEntity, { where: { companyId: IsNull() }, order: { createdAt: 'ASC' } });
            const alertas = await m.countBy(AlertaEntity, { companyId: IsNull() });
            if (usuarios.length === 0 && usinas.length === 0 && alertas === 0) return;

            const cnpjDoEnv = somenteDigitos(this.config.get<string>('COMPANY_CNPJ', ''));
            const cnpj = cnpjValido(cnpjDoEnv) && !(await m.existsBy(CompanieEntity, { cnpj: cnpjDoEnv })) ? cnpjDoEnv : null;
            const empresa = await m.save(m.create(CompanieEntity, { razaoSocial: this.config.get<string>('COMPANY_NAME') || 'Minha empresa', cnpj }));

            await m.update(UserEntity, { companyId: IsNull() }, { companyId: empresa.id });
            if (usuarios.length > 0 && !usuarios.some((u) => u.isAdmin)) await m.update(UserEntity, { id: usuarios[0].id }, { isAdmin: true });

            // Uma usina por empresa: fica a mais antiga (só deveria existir uma).
            const [usina, ...sobras] = usinas;
            if (usina) await m.update(PlantEntity, { id: usina.id }, { companyId: empresa.id });
            if (sobras.length) await m.remove(sobras);

            await m.update(AlertaEntity, { companyId: IsNull() }, { companyId: empresa.id });

            this.logger.log(
                `Dados antigos migrados para a empresa "${empresa.razaoSocial}": ${usuarios.length} usuário(s), ${usinas.length ? 1 : 0} usina, ${alertas} alerta(s).`,
            );
        });
    }
}
