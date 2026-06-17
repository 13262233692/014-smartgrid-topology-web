export interface LowVoltageAlert {
  nodeId: string;
  nodeName: string;
  baseVoltage: number;
  voltageMagnitude: number;
  voltagePerUnit: number;
  dropPercentage: number;
  threshold: number;
  timestamp: number;
  severity: 'WARNING' | 'CRITICAL';
  realLoad: number;
  reactiveLoad: number;
}

export interface ScadaDataPoint {
  nodeId: string;
  timestamp: number;
  realPower?: number;
  reactivePower?: number;
  voltageMagnitude?: number;
  breakerStatus?: boolean;
  powerFactor?: number;
}

export interface VoltageUpdate {
  nodeId: string;
  voltage: number;
  angle: number;
}

export interface PowerFlowStatus {
  converged: boolean;
  iterations: number;
  maxMismatch: number;
  calculationTimeMs: number;
  lowVoltageCount?: number;
}

export enum EquipmentType {
  SUBSTATION = 'Substation',
  BUSBAR_SECTION = 'BusbarSection',
  BREAKER = 'Breaker',
  POWER_TRANSFORMER = 'PowerTransformer',
  TRANSFORMER_WINDING = 'TransformerWinding',
  FEEDER = 'Feeder',
  CONNECTIVITY_NODE = 'ConnectivityNode',
  TERMINAL = 'Terminal',
  ENERGY_CONSUMER = 'EnergyConsumer',
  ENERGY_SOURCE = 'EnergySource',
}

export interface EquipmentNode {
  id: string;
  mrid: string;
  name: string;
  type: EquipmentType;
  description?: string;
  baseVoltage?: number;
  energized?: boolean;
  normalOpen?: boolean;
  open?: boolean;
  ratedKV?: number;
  powerRating?: number;
  p?: number;
  q?: number;
  substationId?: string;
  feederId?: string;
  transformerId?: string;
  voltageLevelId?: string;
  sequenceNumber?: number;
  connectivityNodeId?: string;
  [key: string]: any;
}

export interface ConnectionEdge {
  id: string;
  source: string;
  target: string;
  sourceTerminal?: string;
  targetTerminal?: string;
  relationship: string;
}

export interface ParsedCimData {
  nodes: EquipmentNode[];
  edges: ConnectionEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    byType: Record<string, number>;
  };
}

export interface TopologyResult {
  nodes: EquipmentNode[];
  edges: ConnectionEdge[];
  root: EquipmentNode;
  depth: number;
  cycles?: string[][];
}
