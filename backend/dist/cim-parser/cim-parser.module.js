"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CimParserModule = void 0;
const common_1 = require("@nestjs/common");
const cim_parser_service_1 = require("./cim-parser.service");
let CimParserModule = class CimParserModule {
};
exports.CimParserModule = CimParserModule;
exports.CimParserModule = CimParserModule = __decorate([
    (0, common_1.Module)({
        providers: [cim_parser_service_1.CimParserService],
        exports: [cim_parser_service_1.CimParserService],
    })
], CimParserModule);
//# sourceMappingURL=cim-parser.module.js.map