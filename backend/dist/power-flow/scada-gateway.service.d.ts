import { OnModuleInit } from '@nestjs/common';
import { PowerFlowService } from './power-flow.service';
import { WebSocketGateway } from './websocket.gateway';
import { ScadaDataPoint, ScadaBatch } from './power-flow.types';
export declare class ScadaGatewayService implements OnModuleInit {
    private readonly powerFlow;
    private readonly wsGateway;
    private simulationInterval;
    private simulationRunning;
    private loadMultiplier;
    constructor(powerFlow: PowerFlowService, wsGateway: WebSocketGateway);
    onModuleInit(): Promise<void>;
    ingestScadaBatch(batch: ScadaBatch): Promise<void>;
    ingestDataPoint(dp: ScadaDataPoint): Promise<void>;
    runPowerFlowAndPush(): Promise<void>;
    startSimulation(intervalMs?: number): void;
    stopSimulation(): void;
    setLoadMultiplier(multiplier: number): void;
    isSimulationRunning(): boolean;
    private runSimulationCycle;
}
