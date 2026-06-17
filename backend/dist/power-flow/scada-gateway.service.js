"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScadaGatewayService = void 0;
const common_1 = require("@nestjs/common");
const power_flow_service_1 = require("./power-flow.service");
const websocket_gateway_1 = require("./websocket.gateway");
let ScadaGatewayService = class ScadaGatewayService {
    constructor(powerFlow, wsGateway) {
        this.powerFlow = powerFlow;
        this.wsGateway = wsGateway;
        this.simulationInterval = null;
        this.simulationRunning = false;
        this.loadMultiplier = 1.0;
    }
    async onModuleInit() { }
    async ingestScadaBatch(batch) {
        await this.powerFlow.applyScadaData(batch.dataPoints);
        this.wsGateway.broadcastScadaData(batch.dataPoints);
    }
    async ingestDataPoint(dp) {
        await this.powerFlow.applyScadaData([dp]);
        this.wsGateway.broadcastScadaData([dp]);
    }
    async runPowerFlowAndPush() {
        const result = await this.powerFlow.solve();
        if (!result)
            return;
        this.wsGateway.broadcastPowerFlowResult(result);
        this.wsGateway.broadcastLowVoltageAlerts(result.lowVoltageNodes);
        const voltageUpdates = Array.from(result.buses.values()).map(b => ({
            nodeId: b.id,
            voltage: b.voltageMagnitude,
            angle: b.voltageAngle,
        }));
        this.wsGateway.broadcastVoltageUpdates(voltageUpdates);
    }
    startSimulation(intervalMs = 5000) {
        if (this.simulationRunning)
            return;
        this.simulationRunning = true;
        console.log('[SCADA] Starting data simulation');
        this.runSimulationCycle();
        this.simulationInterval = setInterval(() => {
            this.runSimulationCycle();
        }, intervalMs);
    }
    stopSimulation() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        this.simulationRunning = false;
        console.log('[SCADA] Stopped data simulation');
    }
    setLoadMultiplier(multiplier) {
        this.loadMultiplier = Math.max(0.5, Math.min(3.0, multiplier));
        console.log(`[SCADA] Load multiplier set to ${this.loadMultiplier.toFixed(2)}x`);
    }
    isSimulationRunning() {
        return this.simulationRunning;
    }
    async runSimulationCycle() {
        try {
            const repo = this.powerFlow.topologyRepo;
            const idx = await (repo.ensureIndex ? repo.ensureIndex() : null);
            if (!idx)
                return;
            const loadNodes = Array.from(idx.nodes.values()).filter((n) => n.type === 'EnergyConsumer' && n.energized !== false);
            if (loadNodes.length === 0)
                return;
            const dataPoints = [];
            const timestamp = Date.now();
            const spikeTrigger = Math.random() < 0.15;
            const spikeNodes = spikeTrigger
                ? loadNodes.sort(() => Math.random() - 0.5).slice(0, Math.floor(loadNodes.length * 0.3))
                : [];
            const spikeSet = new Set(spikeNodes.map((n) => n.id));
            for (const node of loadNodes) {
                const baseP = node.p || (50 + Math.random() * 300);
                const baseQ = node.q || (20 + Math.random() * 150);
                const fluctuation = 0.85 + Math.random() * 0.3;
                const spikeFactor = spikeSet.has(node.id) ? 2.5 + Math.random() * 1.5 : 1.0;
                const p = baseP * fluctuation * this.loadMultiplier * spikeFactor;
                const q = baseQ * fluctuation * this.loadMultiplier * spikeFactor;
                dataPoints.push({
                    nodeId: node.id,
                    timestamp,
                    realPower: Math.round(p * 100) / 100,
                    reactivePower: Math.round(q * 100) / 100,
                    powerFactor: Math.round((p / Math.sqrt(p * p + q * q)) * 1000) / 1000,
                });
            }
            if (dataPoints.length > 0) {
                await this.ingestScadaBatch({
                    batchId: `SIM-${timestamp}`,
                    timestamp,
                    source: 'SIMULATION',
                    dataPoints,
                });
            }
            await this.runPowerFlowAndPush();
        }
        catch (e) {
            console.warn('[SCADA] Simulation cycle error:', e.message);
        }
    }
};
exports.ScadaGatewayService = ScadaGatewayService;
exports.ScadaGatewayService = ScadaGatewayService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [power_flow_service_1.PowerFlowService,
        websocket_gateway_1.WebSocketGateway])
], ScadaGatewayService);
//# sourceMappingURL=scada-gateway.service.js.map