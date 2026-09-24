import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LimiteEntity } from './entities/limite.entity';
import { LimiteService } from './limite.service';
import { LimiteController } from './limite.controller';

@Module({
    imports: [TypeOrmModule.forFeature([LimiteEntity])],
    controllers: [LimiteController],
    providers: [LimiteService],
    exports: [LimiteService],
})
export class LimiteModule {}
