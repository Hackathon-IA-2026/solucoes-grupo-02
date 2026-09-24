import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post, Put, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '@/user/user.service';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import { UpdateProfileDto } from '@/user/dto/update-profile.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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

    @IsPublic()
    @HttpCode(HttpStatus.OK)
    @Post('forgot-password')
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        await this.authService.forgotPassword(dto.email);
    }

    @IsPublic()
    @HttpCode(HttpStatus.OK)
    @Post('reset-password')
    async resetPassword(@Body() dto: ResetPasswordDto) {
        const ok = await this.userService.resetPasswordWithToken(dto.token, dto.password);
        if (!ok) throw new BadRequestException('Link inválido ou expirado.');
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Request() req: { user: UserPayload }) {
        const user = await this.userService.findUserById(req.user.id);
        return this.authService.buildUserResponse(user);
    }

    @UseGuards(JwtAuthGuard)
    @Put('me')
    async updateMe(@Request() req: { user: UserPayload }, @Body() dto: UpdateProfileDto) {
        const user = await this.userService.updateProfile(req.user.id, dto);
        return this.authService.buildUserResponse(user);
    }
}
