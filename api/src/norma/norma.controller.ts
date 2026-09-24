import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import * as PDFDocument from 'pdfkit';
import { NormaService, toNormResponse } from './norma.service';
import { CreateNormaDto } from './dto/create-norma.dto';
import { UpdateNormaDto } from './dto/update-norma.dto';
import { NormaSource } from './entities/norma.entity';

@Controller('norms')
export class NormaController {
    constructor(private readonly normaService: NormaService) {}

    @Post()
    async create(@Body() dto: CreateNormaDto) {
        const norma = await this.normaService.create(dto);
        return toNormResponse(norma);
    }

    @Get()
    async list(@Query('source') source?: NormaSource) {
        const normas = await this.normaService.list(source);
        return normas.map(toNormResponse);
    }

    @Get(':id')
    async getById(@Param('id', ParseUUIDPipe) id: string) {
        const norma = await this.normaService.getById(id);
        return toNormResponse(norma);
    }

    @Get(':id/pdf')
    async downloadPdf(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
        const norma = await this.normaService.getById(id);
        const resumo = toNormResponse(norma);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="resumo-${norma.id}.pdf"`);

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        doc.fontSize(18).text(resumo.title);
        if (resumo.code) doc.moveDown(0.3).fontSize(10).fillColor('#666').text(resumo.code);
        doc.moveDown().fillColor('#000').fontSize(11).text(`${resumo.sourceLabel} · ${resumo.date}`);
        if (resumo.deadline) doc.moveDown(0.5).text(`Prazo: ${resumo.deadline}`);

        doc.moveDown().fontSize(13).text('O que muda');
        doc.fontSize(11);
        if (resumo.changes.length === 0) doc.text('—');
        resumo.changes.forEach((c) => doc.text(`• ${c}`));

        doc.moveDown().fontSize(13).text('Por que importa para a sua operação');
        doc.fontSize(11).text(resumo.why || '—');

        if (resumo.url) doc.moveDown().fontSize(10).fillColor('#1D4ED8').text(resumo.url, { link: resumo.url, underline: true });

        doc.end();
    }

    @Put(':id')
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNormaDto) {
        const norma = await this.normaService.update(id, dto);
        return toNormResponse(norma);
    }

    @Delete(':id')
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        await this.normaService.remove(id);
    }
}
