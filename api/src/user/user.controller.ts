import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UserPayload } from '../auth/types/user.payload.type';
import { EquipeService } from './equipe.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

// Equipe da empresa — só admins. Os dados do próprio usuário ficam em /auth/me.
@UseGuards(AdminGuard)
@Controller('user')
export class UserController {
    constructor(private readonly equipeService: EquipeService) {}

    @Get()
    async listar(@Request() req: { user: UserPayload }) {
        return await this.equipeService.listar(req.user);
    }

    @Post()
    async convidar(@Request() req: { user: UserPayload }, @Body() dto: InviteUserDto) {
        return await this.equipeService.convidar(req.user, dto);
    }

    @Post(':id/convite')
    async renovarConvite(@Request() req: { user: UserPayload }, @Param('id', ParseUUIDPipe) id: string) {
        return await this.equipeService.renovarConvite(req.user, id);
    }

    @Patch(':id')
    async alterar(@Request() req: { user: UserPayload }, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMemberDto) {
        return await this.equipeService.alterarAdmin(req.user, id, dto.isAdmin);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remover(@Request() req: { user: UserPayload }, @Param('id', ParseUUIDPipe) id: string) {
        await this.equipeService.remover(req.user, id);
    }
}
