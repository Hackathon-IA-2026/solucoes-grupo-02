import { Controller, Get, Post, Body, Put, Param, Delete, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { IsPublic } from '@/auth/decorators/is-public.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthService } from '@/auth/auth.service';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @IsPublic()
    @Get('all')
    async getAllUsers() {
        return this.userService.getAllUsers();
    }

    @IsPublic()
    @Get(':id')
    async getUserById(@Param('id') id: string) {
        return this.userService.findUserById(id);
    }

    @HttpCode(HttpStatus.OK)
    @Delete('delete/:id')
    async deleteUser(@Param('id') id: string) {
        return this.userService.deleteUserById(id);
    }
}
