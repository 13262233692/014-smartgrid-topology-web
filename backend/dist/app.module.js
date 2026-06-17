"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const neo4j_module_1 = require("./neo4j/neo4j.module");
const topology_module_1 = require("./topology/topology.module");
const cim_parser_module_1 = require("./cim-parser/cim-parser.module");
const power_flow_module_1 = require("./power-flow/power-flow.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            platform_express_1.MulterModule.register({
                limits: { fileSize: 100 * 1024 * 1024 },
            }),
            neo4j_module_1.Neo4jModule,
            cim_parser_module_1.CimParserModule,
            topology_module_1.TopologyModule,
            power_flow_module_1.PowerFlowModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map