export enum BusType {
  SLACK = 'SLACK',
  PV = 'PV',
  PQ = 'PQ',
}

export interface PowerFlowBus {
  id: string;
  busNumber: number;
  type: BusType;
  baseVoltage: number;
  voltageMagnitude: number;
  voltageAngle: number;
  realPower: number;
  reactivePower: number;
  realPowerGeneration?: number;
  reactivePowerGeneration?: number;
  reactiveMin?: number;
  reactiveMax?: number;
  area?: number;
  zone?: string;
}

export interface PowerFlowBranch {
  id: string;
  fromBus: string;
  toBus: string;
  resistance: number;
  reactance: number;
  chargingSusceptance: number;
  tapRatio: number;
  phaseShift: number;
  lineRating?: number;
  fromNumber: number;
  toNumber: number;
}

export interface PowerFlowResult {
  converged: boolean;
  iterations: number;
  maxMismatch: number;
  buses: Map<string, PowerFlowBus>;
  branchFlows: Map<string, {
    fromMW: number;
    fromMVAr: number;
    toMW: number;
    toMVAr: number;
    lossesMW: number;
    lossesMVAr: number;
  }>;
  lowVoltageNodes: LowVoltageAlert[];
  calculationTimeMs: number;
}

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

export interface ScadaBatch {
  batchId: string;
  timestamp: number;
  source: string;
  dataPoints: ScadaDataPoint[];
}
