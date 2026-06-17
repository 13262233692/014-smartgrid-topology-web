import { PowerFlowService } from './power-flow.service';
import { ScadaGatewayService } from './scada-gateway.service';
import { ScadaDataPoint, ScadaBatch, LowVoltageAlert } from './power-flow.types';
export declare class PowerFlowController {
    private readonly powerFlow;
    private readonly scadaGateway;
    constructor(powerFlow: PowerFlowService, scadaGateway: ScadaGatewayService);
    ingestBatch(batch: ScadaBatch): Promise<{
        ok: boolean;
        count: number;
    }>;
    ingestPoint(dp: ScadaDataPoint): Promise<{
        ok: boolean;
    }>;
    solve(): Promise<{
        converged: boolean;
        iterations: number;
        maxMismatch: number;
        calculationTimeMs: number;
        lowVoltageNodes: LowVoltageAlert[];
    } | null>;
    solveAndPush(): Promise<{
        ok: boolean;
        lowVoltageCount: number;
    }>;
    getAlerts(): LowVoltageAlert[];
    getNodeVoltage(nodeId: string): {
        voltage: number | null;
        pu: number | null;
    };
    getLastResult(): any;
    startSimulation(interval?: string): {
        ok: boolean;
        intervalMs: number;
    };
    stopSimulation(): {
        ok: boolean;
    };
    getSimulationStatus(): {
        running: boolean;
        loadMultiplier: number;
    };
    setLoadMultiplier(body: {
        multiplier: number;
    }): {
        ok: boolean;
        multiplier: number;
    };
    rebuild(body?: {
        substationId?: string;
    }): Promise<{
        ok: boolean;
        busCount: number;
        branchCount: number;
        slackBusId?: string;
    }>;
    clear(): {
        ok: boolean;
    };
}
