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
exports.TopologyService = void 0;
const common_1 = require("@nestjs/common");
const topology_repository_1 = require("./topology.repository");
const cim_parser_service_1 = require("../cim-parser/cim-parser.service");
let TopologyService = class TopologyService {
    constructor(repository, parser) {
        this.repository = repository;
        this.parser = parser;
        this.lastParsedData = null;
    }
    async importCimXml(fileBuffer) {
        const parsed = this.parser.parseXmlBuffer(fileBuffer);
        this.lastParsedData = parsed;
        await this.repository.saveParsedData(parsed);
        return parsed;
    }
    async generateAndImportDemo() {
        const demo = this.parser.generateDemoData();
        this.lastParsedData = demo;
        await this.repository.saveParsedData(demo);
        return demo;
    }
    async getSubstations() {
        return this.repository.findAllSubstations();
    }
    async getEquipmentById(id) {
        return this.repository.findNodeById(id);
    }
    async getDownstreamTopology(substationId, maxDepth = 6) {
        const root = await this.repository.findNodeById(substationId);
        if (!root) {
            return { nodes: [], edges: [], root: {}, depth: 0, cycles: [] };
        }
        const { nodes, edges, cycles } = await this.repository.findDownstreamTopology(substationId, maxDepth);
        return { nodes, edges, root, depth: maxDepth, cycles };
    }
    async detectCycles(substationId) {
        return this.repository.detectCycles(substationId);
    }
    async getStats() {
        return this.repository.getStats();
    }
    async toggleBreaker(breakerId, open) {
        return this.repository.updateEquipmentStatus(breakerId, open);
    }
};
exports.TopologyService = TopologyService;
exports.TopologyService = TopologyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [topology_repository_1.TopologyRepository,
        cim_parser_service_1.CimParserService])
], TopologyService);
//# sourceMappingURL=topology.service.js.map