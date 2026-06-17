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
exports.TopologyController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const topology_service_1 = require("./topology.service");
let TopologyController = class TopologyController {
    constructor(service) {
        this.service = service;
    }
    async importCimFile(file) {
        if (!file) {
            return this.service.generateAndImportDemo();
        }
        return this.service.importCimXml(file.buffer);
    }
    async generateDemo() {
        return this.service.generateAndImportDemo();
    }
    async getSubstations() {
        return this.service.getSubstations();
    }
    async getEquipment(id) {
        return this.service.getEquipmentById(id);
    }
    async getDownstream(substationId, depth = '6') {
        return this.service.getDownstreamTopology(substationId, parseInt(depth) || 6);
    }
    async getStats() {
        return this.service.getStats();
    }
    async toggleBreaker(id, body) {
        return this.service.toggleBreaker(id, body.open);
    }
    async getCycles(substationId) {
        return this.service.detectCycles(substationId);
    }
};
exports.TopologyController = TopologyController;
__decorate([
    (0, common_1.Post)('import'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TopologyController.prototype, "importCimFile", null);
__decorate([
    (0, common_1.Post)('demo'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TopologyController.prototype, "generateDemo", null);
__decorate([
    (0, common_1.Get)('substations'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TopologyController.prototype, "getSubstations", null);
__decorate([
    (0, common_1.Get)('equipment/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TopologyController.prototype, "getEquipment", null);
__decorate([
    (0, common_1.Get)('downstream/:substationId'),
    __param(0, (0, common_1.Param)('substationId')),
    __param(1, (0, common_1.Query)('depth')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TopologyController.prototype, "getDownstream", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TopologyController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)('toggle-breaker/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TopologyController.prototype, "toggleBreaker", null);
__decorate([
    (0, common_1.Get)('cycles'),
    __param(0, (0, common_1.Query)('substationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TopologyController.prototype, "getCycles", null);
exports.TopologyController = TopologyController = __decorate([
    (0, common_1.Controller)('api/topology'),
    __metadata("design:paramtypes", [topology_service_1.TopologyService])
], TopologyController);
//# sourceMappingURL=topology.controller.js.map