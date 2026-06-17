import { TopologyRepository } from './topology.repository';
import { CimParserService } from '../cim-parser/cim-parser.service';
import { ParsedCimData, EquipmentNode, TopologyResult } from '../cim-parser/cim.types';
export declare class TopologyService {
    private readonly repository;
    private readonly parser;
    private lastParsedData;
    constructor(repository: TopologyRepository, parser: CimParserService);
    importCimXml(fileBuffer: Buffer): Promise<ParsedCimData>;
    generateAndImportDemo(): Promise<ParsedCimData>;
    getSubstations(): Promise<EquipmentNode[]>;
    getEquipmentById(id: string): Promise<EquipmentNode | null>;
    getDownstreamTopology(substationId: string, maxDepth?: number): Promise<TopologyResult>;
    detectCycles(substationId?: string): Promise<string[][]>;
    getStats(): Promise<{
        totalNodes: number;
        totalEdges: number;
        byType: Record<string, number>;
    }>;
    toggleBreaker(breakerId: string, open: boolean): Promise<EquipmentNode | null>;
}
