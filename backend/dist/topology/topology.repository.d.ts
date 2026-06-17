import { Neo4jService } from '../neo4j/neo4j.service';
import { EquipmentNode, ConnectionEdge, ParsedCimData } from '../cim-parser/cim.types';
export declare class TopologyRepository {
    private readonly neo4j;
    private memoryStore;
    private memoryIndex;
    private readonly MAX_NODES_PER_QUERY;
    private readonly MAX_ITERATIONS;
    constructor(neo4j: Neo4jService);
    private buildIndex;
    saveParsedData(data: ParsedCimData): Promise<boolean>;
    findAllSubstations(): Promise<EquipmentNode[]>;
    findNodeById(id: string): Promise<EquipmentNode | null>;
    private ensureIndex;
    findDownstreamTopology(rootId: string, maxDepth?: number): Promise<{
        nodes: EquipmentNode[];
        edges: ConnectionEdge[];
        cycles?: string[][];
    }>;
    private bfsWithColoring;
    private reconstructCycle;
    detectCycles(rootId?: string): Promise<string[][]>;
    getStats(): Promise<{
        totalNodes: number;
        totalEdges: number;
        byType: Record<string, number>;
    }>;
    updateEquipmentStatus(id: string, open: boolean): Promise<EquipmentNode | null>;
    private recordToNode;
}
