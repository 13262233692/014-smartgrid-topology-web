import { TopologyService } from './topology.service';
import { ParsedCimData, EquipmentNode, TopologyResult } from '../cim-parser/cim.types';
export declare class TopologyController {
    private readonly service;
    constructor(service: TopologyService);
    importCimFile(file: Express.Multer.File): Promise<ParsedCimData>;
    generateDemo(): Promise<ParsedCimData>;
    getSubstations(): Promise<EquipmentNode[]>;
    getEquipment(id: string): Promise<EquipmentNode | null>;
    getDownstream(substationId: string, depth?: string): Promise<TopologyResult>;
    getStats(): Promise<{
        totalNodes: number;
        totalEdges: number;
        byType: Record<string, number>;
    }>;
    toggleBreaker(id: string, body: {
        open: boolean;
    }): Promise<EquipmentNode | null>;
    getCycles(substationId?: string): Promise<string[][]>;
}
