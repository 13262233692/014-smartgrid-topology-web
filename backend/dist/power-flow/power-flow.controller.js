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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PowerFlowController = void 0;
const common_1 = require("@nestjs/common");
const power_flow_service_1 = require("./power-flow.service");
const scada_gateway_service_1 = require("./scada-gateway.service");
let PowerFlowController = class PowerFlowController {
    constructor(powerFlow, scadaGateway) {
        this.powerFlow = powerFlow;
        this.scadaGateway = scadaGateway;
    }
    async ingestBatch(batch) {
        await this.scadaGateway.ingestScadaBatch(batch);
        return { ok: true, count: batch.dataPoints.length };
    }
    async ingestPoint(dp) {
        await this.scadaGateway.ingestDataPoint(dp);
        return { ok: true };
    }
    async solve() {
        const result = await this.powerFlow.solve();
        if (!result)
            return null;
        return {
            converged: result.converged,
            iterations: result.iterations,
            maxMismatch: result.maxMismatch,
            calculationTimeMs: result.calculationTimeMs,
            lowVoltageNodes: result.lowVoltageNodes,
        };
    }
    async solveAndPush() {
        await this.scadaGateway.runPowerFlowAndPush();
        const alerts = this.powerFlow.getLowVoltageAlerts();
        return { ok: true, lowVoltageCount: alerts.length };
    }
    getAlerts() {
        return this.powerFlow.getLowVoltageAlerts();
    }
    getNodeVoltage(nodeId) {
        const pu = this.powerFlow.getNodeVoltage(nodeId);
        return { voltage: pu ? pu * 10 : null, pu };
    }
    getLastResult() {
        const r = this.powerFlow.getLastResult();
        if (!r)
            return null;
        return {
            converged: r.converged,
            iterations: r.iterations,
            maxMismatch: r.maxMismatch,
            calculationTimeMs: r.calculationTimeMs,
            lowVoltageCount: r.lowVoltageNodes.length,
        };
    }
    startSimulation(interval = '5000') {
        const ms = parseInt(interval) || 5000;
        this.scadaGateway.startSimulation(ms);
        return { ok: true, intervalMs: ms };
    }
    stopSimulation() {
        this.scadaGateway.stopSimulation();
        return { ok: true };
    }
    getSimulationStatus() {
        return {
            running: this.scadaGateway.isSimulationRunning(),
            loadMultiplier: 1.0,
        };
    }
    setLoadMultiplier(body) {
        const m = body.multiplier;
        this.scadaGateway.setLoadMultiplier(m);
        return { ok: true, multiplier: m };
    }
    async rebuild(body = {}) {
        const ok = await this.powerFlow.rebuildSystem(body.substationId);
        const r = this.powerFlow.getLastResult();
        const buses = this.powerFlow.currentBuses;
        const branches = this.powerFlow.currentBranches;
        const slackBus = buses?.find(b => b.type === 'SLACK');
        return {
            ok,
            busCount: buses?.length || 0,
            branchCount: branches?.length || 0,
            slackBusId: slackBus?.id,
        };
    }
    clear() {
        this.powerFlow.clearCache();
        return { ok: true };
    }
};
exports.PowerFlowController = PowerFlowController;
__decorate([
    (0, common_1.Post)('scada/batch'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PowerFlowController.prototype, "ingestBatch", null);
__decorate([
    (0, common_1.Post)('scada/point'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PowerFlowController.prototype, "ingestPoint", null);
__decorate([
    (0, common_1.Post)('solve'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PowerFlowController.prototype, "solve", null);
__decorate([
    (0, common_1.Post)('solve-and-push'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PowerFlowController.prototype, "solveAndPush", null);
__decorate([
    (0, common_1.Get)('alerts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Array)
], PowerFlowController.prototype, "getAlerts", null);
__decorate([
    (0, common_1.Get)('voltage/:nodeId'),
    __param(0, (0, common_1.Param)('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Object)
], PowerFlowController.prototype, "getNodeVoltage", null);
__decorate([
    (0, common_1.Get)('result'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], PowerFlowController.prototype, "getLastResult", null);
__decorate([
    (0, common_1.Post)('simulation/start'),
    __param(0, (0, common_1.Query)('interval')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Object)
], PowerFlowController.prototype, "startSimulation", null);
__decorate([
    (0, common_1.Post)('simulation/stop'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], PowerFlowController.prototype, "stopSimulation", null);
__decorate([
    (0, common_1.Get)('simulation/status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], PowerFlowController.prototype, "getSimulationStatus", null);
__decorate([
    (0, common_1.Post)('simulation/load'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Object)
], PowerFlowController.prototype, "setLoadMultiplier", null);
__decorate([
    (0, common_1.Post)('rebuild'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PowerFlowController.prototype, "rebuild", null);
__decorate([
    (0, common_1.Post)('clear'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], PowerFlowController.prototype, "clear", null);
exports.PowerFlowController = PowerFlowController = __decorate([
    (0, common_1.Controller)('api/power-flow'),
    __metadata("design:paramtypes", [power_flow_service_1.PowerFlowService,
        scada_gateway_service_1.ScadaGatewayService])
], PowerFlowController);
//# sourceMappingURL=power-flow.controller.js.map