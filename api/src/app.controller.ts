import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IsPublic } from './auth/decorators/is-public.decorator';

@Controller()
export class AppController {
    constructor(private readonly dataSource: DataSource) {}

    @IsPublic()
    @Get('health')
    async health() {
        try {
            await this.dataSource.query('SELECT 1');
        } catch {
            throw new ServiceUnavailableException({ status: 'erro', banco: 'fora do ar' });
        }
        return { status: 'ok' };
    }
}
