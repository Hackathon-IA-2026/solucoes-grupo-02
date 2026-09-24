import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CompanieService {
    constructor(private readonly config: ConfigService) {}

    getCompanie() {
        return {
            company: this.config.get<string>('COMPANY_NAME', ''),
            cnpj: this.config.get<string>('COMPANY_CNPJ', ''),
        };
    }
}
