import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { EquipeService } from './equipe.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [TypeOrmModule.forFeature([UserEntity]), NotificationModule],
    controllers: [UserController],
    providers: [UserService, EquipeService],
    exports: [UserService],
})
export class UserModule {}
