import { Module } from '@nestjs/common';
import { CompanieService } from './companie.service';

@Module({
    providers: [CompanieService],
    exports: [CompanieService],
})
export class CompanieModule {}
