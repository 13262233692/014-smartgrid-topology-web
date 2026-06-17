import { OnModuleInit } from '@nestjs/common';
import { TopologyRepository } from '../topology/topology.repository';
import { PowerFlowResult, LowVoltageAlert, ScadaDataPoint, ScadaBatch } from './power-flow.types';
export declare class PowerFlowService implements OnModuleInit {
    private readonly topologyRepo;
    private solver;
    private lastResult;
    private currentBuses;
    private currentBranches;
    private scadaCache;
    constructor(topologyRepo: TopologyRepository);
    onModuleInit(): Promise<void>;
    rebuildSystem(substationId?: string): Promise<boolean>;
    applyScadaData(dataPoints: ScadaDataPoint[]): Promise<void>;
    solve(): Promise<PowerFlowResult | null>;
    getLastResult(): PowerFlowResult | null;
    getLowVoltageAlerts(): LowVoltageAlert[];
    getNodeVoltage(nodeId: string): number | null;
    handleScadaBatch(batch: ScadaBatch): Promise<void>;
    getScadaSnapshot(): ScadaDataPoint[];
    clearCache(): void;
}
