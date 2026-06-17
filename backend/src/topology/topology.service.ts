import { Injectable } from '@nestjs/common';
import { TopologyRepository } from './topology.repository';
import { CimParserService } from '../cim-parser/cim-parser.service';
import { ParsedCimData, EquipmentNode, TopologyResult } from '../cim-parser/cim.types';

@Injectable()
export class TopologyService {
  private lastParsedData: ParsedCimData | null = null;

  constructor(
    private readonly repository: TopologyRepository,
    private readonly parser: CimParserService,
  ) {}

  async importCimXml(fileBuffer: Buffer): Promise<ParsedCimData> {
    const parsed = this.parser.parseXmlBuffer(fileBuffer);
    this.lastParsedData = parsed;
    await this.repository.saveParsedData(parsed);
    return parsed;
  }

  async generateAndImportDemo(): Promise<ParsedCimData> {
    const demo = this.parser.generateDemoData();
    this.lastParsedData = demo;
    await this.repository.saveParsedData(demo);
    return demo;
  }

  async getSubstations(): Promise<EquipmentNode[]> {
    return this.repository.findAllSubstations();
  }

  async getEquipmentById(id: string): Promise<EquipmentNode | null> {
    return this.repository.findNodeById(id);
  }

  async getDownstreamTopology(substationId: string, maxDepth: number = 6): Promise<TopologyResult> {
    const root = await this.repository.findNodeById(substationId);
    if (!root) {
      return { nodes: [], edges: [], root: {} as any, depth: 0, cycles: [] };
    }
    const { nodes, edges, cycles } = await this.repository.findDownstreamTopology(substationId, maxDepth);
    return { nodes, edges, root, depth: maxDepth, cycles };
  }

  async detectCycles(substationId?: string): Promise<string[][]> {
    return this.repository.detectCycles(substationId);
  }

  async getStats(): Promise<{ totalNodes: number; totalEdges: number; byType: Record<string, number> }> {
    return this.repository.getStats();
  }

  async toggleBreaker(breakerId: string, open: boolean): Promise<EquipmentNode | null> {
    return this.repository.updateEquipmentStatus(breakerId, open);
  }
}
