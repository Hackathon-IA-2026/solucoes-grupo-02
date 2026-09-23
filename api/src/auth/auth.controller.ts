import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Request, Delete, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserService } from '@/user/user.service';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import { IsPublic } from './decorators/is-public.decorator';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
    ) {}

    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Post('login')
    signIn(@Request() req) {
        this.authService.generateJwtToken(req.user);
    }

    @IsPublic()
    @Post('create-user')
    @HttpCode(HttpStatus.CREATED)
    async createUser(@Body() dto: CreateUserDto) {
        const user = this.userService.createUser(dto);
        return await this.authService.generateJwtToken((await user).id);
    }
}
