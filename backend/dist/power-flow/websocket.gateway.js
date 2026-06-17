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
exports.WebSocketGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
let WebSocketGateway = class WebSocketGateway {
    constructor() {
        this.lowVoltageCache = [];
    }
    afterInit(server) {
        console.log('[WebSocket] Gateway initialized');
    }
    handleConnection(client) {
        console.log(`[WebSocket] Client connected: ${client.id}`);
        client.emit('lowVoltageAlerts', this.lowVoltageCache);
    }
    handleDisconnect(client) {
        console.log(`[WebSocket] Client disconnected: ${client.id}`);
    }
    broadcastLowVoltageAlerts(alerts) {
        this.lowVoltageCache = alerts;
        this.server.emit('lowVoltageAlerts', alerts);
        if (alerts.length > 0) {
            console.log(`[WebSocket] Broadcast ${alerts.length} low-voltage alerts`);
        }
    }
    broadcastVoltageUpdates(updates) {
        this.server.emit('voltageUpdates', updates);
    }
    broadcastScadaData(data) {
        this.server.emit('scadaData', data);
    }
    broadcastPowerFlowResult(result) {
        this.server.emit('powerFlowResult', {
            converged: result.converged,
            iterations: result.iterations,
            maxMismatch: result.maxMismatch,
            calculationTimeMs: result.calculationTimeMs,
            lowVoltageCount: result.lowVoltageNodes.length,
        });
    }
    handleRequestAlerts(client) {
        client.emit('lowVoltageAlerts', this.lowVoltageCache);
    }
};
exports.WebSocketGateway = WebSocketGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], WebSocketGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('requestAlerts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], WebSocketGateway.prototype, "handleRequestAlerts", null);
exports.WebSocketGateway = WebSocketGateway = __decorate([
    (0, common_1.Injectable)(),
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*' },
        transports: ['websocket', 'polling'],
    })
], WebSocketGateway);
//# sourceMappingURL=websocket.gateway.js.map