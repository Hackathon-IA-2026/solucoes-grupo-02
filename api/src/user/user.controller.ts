import { Controller, Get, Post, Body, Put, Param, Delete, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}
}
