import { Controller, Get, Post, Param, Query, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TopologyService } from './topology.service';
import { ParsedCimData, EquipmentNode, TopologyResult } from '../cim-parser/cim.types';

@Controller('api/topology')
export class TopologyController {
  constructor(private readonly service: TopologyService) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importCimFile(@UploadedFile() file: Express.Multer.File): Promise<ParsedCimData> {
    if (!file) {
      return this.service.generateAndImportDemo();
    }
    return this.service.importCimXml(file.buffer);
  }

  @Post('demo')
  async generateDemo(): Promise<ParsedCimData> {
    return this.service.generateAndImportDemo();
  }

  @Get('substations')
  async getSubstations(): Promise<EquipmentNode[]> {
    return this.service.getSubstations();
  }

  @Get('equipment/:id')
  async getEquipment(@Param('id') id: string): Promise<EquipmentNode | null> {
    return this.service.getEquipmentById(id);
  }

  @Get('downstream/:substationId')
  async getDownstream(
    @Param('substationId') substationId: string,
    @Query('depth') depth: string = '6',
  ): Promise<TopologyResult> {
    return this.service.getDownstreamTopology(substationId, parseInt(depth) || 6);
  }

  @Get('stats')
  async getStats(): Promise<{ totalNodes: number; totalEdges: number; byType: Record<string, number> }> {
    return this.service.getStats();
  }

  @Post('toggle-breaker/:id')
  async toggleBreaker(
    @Param('id') id: string,
    @Body() body: { open: boolean },
  ): Promise<EquipmentNode | null> {
    return this.service.toggleBreaker(id, body.open);
  }

  @Get('cycles')
  async getCycles(@Query('substationId') substationId?: string): Promise<string[][]> {
    return this.service.detectCycles(substationId);
  }
}
