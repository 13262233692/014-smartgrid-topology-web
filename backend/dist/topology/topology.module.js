"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopologyModule = void 0;
const common_1 = require("@nestjs/common");
const topology_controller_1 = require("./topology.controller");
const topology_service_1 = require("./topology.service");
const topology_repository_1 = require("./topology.repository");
const cim_parser_module_1 = require("../cim-parser/cim-parser.module");
let TopologyModule = class TopologyModule {
};
exports.TopologyModule = TopologyModule;
exports.TopologyModule = TopologyModule = __decorate([
    (0, common_1.Module)({
        imports: [cim_parser_module_1.CimParserModule],
        controllers: [topology_controller_1.TopologyController],
        providers: [topology_service_1.TopologyService, topology_repository_1.TopologyRepository],
        exports: [topology_service_1.TopologyService],
    })
], TopologyModule);
//# sourceMappingURL=topology.module.js.map