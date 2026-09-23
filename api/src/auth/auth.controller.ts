import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards, Request, Delete, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { UserService } from '@/user/user.service';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import { IsPublic } from './decorators/is-public.decorator';
import { UserPayload } from './types/user.payload.type';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
    ) {}

    @IsPublic()
    @HttpCode(HttpStatus.OK)
    @UseGuards(LocalAuthGuard)
    @Post('login')
    async signIn(@Request() req: { user: UserPayload }) {
        return await this.authService.generateJwtToken(req.user);
    }

    @IsPublic()
    @Post('create-user')
    @HttpCode(HttpStatus.CREATED)
    async createUser(@Body() dto: CreateUserDto) {
        const user = this.userService.createUser(dto);
        return await this.authService.generateJwtToken((await user).id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Request() req: { user: UserPayload }) {
        return await this.userService.findUserById(req.user.id);
    }
}
