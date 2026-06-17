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
exports.PowerFlowService = void 0;
const common_1 = require("@nestjs/common");
const newton_raphson_1 = require("./newton-raphson");
const topology_repository_1 = require("../topology/topology.repository");
let PowerFlowService = class PowerFlowService {
    constructor(topologyRepo) {
        this.topologyRepo = topologyRepo;
        this.lastResult = null;
        this.currentBuses = [];
        this.currentBranches = [];
        this.scadaCache = new Map();
        this.solver = new newton_raphson_1.NewtonRaphsonPowerFlow({
            maxIterations: 50,
            tolerance: 1e-4,
            lowVoltageThreshold: 0.95,
            baseMVA: 10,
        });
    }
    async onModuleInit() { }
    async rebuildSystem(substationId) {
        try {
            const repo = this.topologyRepo;
            const idx = await (repo.ensureIndex ? repo.ensureIndex() : null);
            if (!idx)
                return false;
            let nodes;
            let edges;
            if (substationId) {
                const result = await this.topologyRepo.findDownstreamTopology(substationId, 10);
                nodes = result.nodes;
                edges = result.edges;
            }
            else {
                nodes = Array.from(idx.nodes.values());
                edges = Array.from(idx.edges.values());
            }
            const { buses, branches } = (0, newton_raphson_1.buildPowerFlowSystemFromTopology)(nodes, edges);
            this.currentBuses = buses;
            this.currentBranches = branches;
            return true;
        }
        catch (e) {
            console.warn('[PowerFlow] rebuildSystem failed:', e.message);
            return false;
        }
    }
    async applyScadaData(dataPoints) {
        for (const dp of dataPoints) {
            this.scadaCache.set(dp.nodeId, dp);
            const bus = this.currentBuses.find(b => b.id === dp.nodeId);
            if (bus) {
                if (dp.realPower !== undefined)
                    bus.realPower = dp.realPower;
                if (dp.reactivePower !== undefined)
                    bus.reactivePower = dp.reactivePower;
                if (dp.voltageMagnitude !== undefined)
                    bus.voltageMagnitude = dp.voltageMagnitude;
            }
        }
    }
    async solve() {
        if (this.currentBuses.length === 0) {
            const ok = await this.rebuildSystem();
            if (!ok || this.currentBuses.length === 0)
                return null;
        }
        const result = this.solver.solve(this.currentBuses, this.currentBranches);
        this.lastResult = result;
        for (const bus of result.buses.values()) {
            const local = this.currentBuses.find(b => b.id === bus.id);
            if (local) {
                local.voltageMagnitude = bus.voltageMagnitude;
                local.voltageAngle = bus.voltageAngle;
            }
        }
        return result;
    }
    getLastResult() {
        return this.lastResult;
    }
    getLowVoltageAlerts() {
        return this.lastResult?.lowVoltageNodes || [];
    }
    getNodeVoltage(nodeId) {
        return this.lastResult?.buses.get(nodeId)?.voltageMagnitude || null;
    }
    handleScadaBatch(batch) {
        return this.applyScadaData(batch.dataPoints);
    }
    getScadaSnapshot() {
        return Array.from(this.scadaCache.values());
    }
    clearCache() {
        this.scadaCache.clear();
        this.lastResult = null;
        this.currentBuses = [];
        this.currentBranches = [];
    }
};
exports.PowerFlowService = PowerFlowService;
exports.PowerFlowService = PowerFlowService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [topology_repository_1.TopologyRepository])
], PowerFlowService);
//# sourceMappingURL=power-flow.service.js.map