import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '@/user/user.service';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import { IsPublic } from './decorators/is-public.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { UserPayload } from './types/user.payload.type';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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
        return await this.authService.buildSession(req.user.id);
    }

    @IsPublic()
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() dto: CreateUserDto) {
        const user = await this.userService.createUser(dto);
        return await this.authService.buildSession(user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Request() req: { user: UserPayload }) {
        return await this.userService.findUserById(req.user.id);
    }
}
