"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PowerFlowModule = void 0;
const common_1 = require("@nestjs/common");
const power_flow_service_1 = require("./power-flow.service");
const scada_gateway_service_1 = require("./scada-gateway.service");
const power_flow_controller_1 = require("./power-flow.controller");
const websocket_gateway_1 = require("./websocket.gateway");
const topology_module_1 = require("../topology/topology.module");
let PowerFlowModule = class PowerFlowModule {
};
exports.PowerFlowModule = PowerFlowModule;
exports.PowerFlowModule = PowerFlowModule = __decorate([
    (0, common_1.Module)({
        imports: [topology_module_1.TopologyModule],
        providers: [power_flow_service_1.PowerFlowService, scada_gateway_service_1.ScadaGatewayService, websocket_gateway_1.WebSocketGateway],
        controllers: [power_flow_controller_1.PowerFlowController],
        exports: [power_flow_service_1.PowerFlowService, scada_gateway_service_1.ScadaGatewayService, websocket_gateway_1.WebSocketGateway],
    })
], PowerFlowModule);
//# sourceMappingURL=power-flow.module.js.map