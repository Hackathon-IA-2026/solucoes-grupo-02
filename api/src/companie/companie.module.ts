import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanieEntity } from './entities/companie.entity';
import { CompanieMigrationService } from './companie-migration.service';

@Module({
    imports: [TypeOrmModule.forFeature([CompanieEntity])],
    providers: [CompanieMigrationService],
})
export class CompanieModule {}
