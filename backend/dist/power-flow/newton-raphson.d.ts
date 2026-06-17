import { PowerFlowBus, PowerFlowBranch, PowerFlowResult } from './power-flow.types';
interface NewtonRaphsonConfig {
    maxIterations?: number;
    tolerance?: number;
    lowVoltageThreshold?: number;
    baseMVA?: number;
}
export declare class NewtonRaphsonPowerFlow {
    private readonly maxIterations;
    private readonly tolerance;
    private readonly lowVoltageThreshold;
    private readonly baseMVA;
    constructor(config?: NewtonRaphsonConfig);
    solve(buses: PowerFlowBus[], branches: PowerFlowBranch[]): PowerFlowResult;
    private buildAdmittanceMatrix;
    private buildJacobian;
    private buildMismatchVector;
    private solveLinearSystem;
    private calculateBranchFlows;
}
export declare function buildPowerFlowSystemFromTopology(nodes: Array<{
    id: string;
    type: string;
    baseVoltage?: number;
    p?: number;
    q?: number;
    energized?: boolean;
    name?: string;
}>, edges: Array<{
    id: string;
    source: string;
    target: string;
    relationship: string;
}>): {
    buses: PowerFlowBus[];
    branches: PowerFlowBranch[];
};
export {};
