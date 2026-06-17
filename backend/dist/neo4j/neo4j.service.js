"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
let Neo4jService = class Neo4jService {
    async onModuleInit() {
        const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
        const user = process.env.NEO4J_USER || 'neo4j';
        const password = process.env.NEO4J_PASSWORD || 'neo4j123';
        this.driver = neo4j_driver_1.default.driver(uri, neo4j_driver_1.default.auth.basic(user, password), {
            maxConnectionLifetime: 3 * 60 * 60 * 1000,
            maxConnectionPoolSize: 50,
            connectionAcquisitionTimeout: 2 * 60 * 1000,
        });
        try {
            await this.driver.verifyConnectivity();
            console.log('[Neo4j] Connected successfully');
            await this.createIndexes();
        }
        catch (e) {
            console.warn('[Neo4j] Connection failed, running in mock mode:', e.message);
        }
    }
    async onModuleDestroy() {
        if (this.driver) {
            await this.driver.close();
        }
    }
    getSession() {
        return this.driver.session();
    }
    getDriver() {
        return this.driver;
    }
    async createIndexes() {
        const session = this.getSession();
        try {
            const indexes = [
                'CREATE INDEX IF NOT EXISTS FOR (n:Substation) ON (n.mrid)',
                'CREATE INDEX IF NOT EXISTS FOR (n:BusbarSection) ON (n.mrid)',
                'CREATE INDEX IF NOT EXISTS FOR (n:Breaker) ON (n.mrid)',
                'CREATE INDEX IF NOT EXISTS FOR (n:PowerTransformer) ON (n.mrid)',
                'CREATE INDEX IF NOT EXISTS FOR (n:TransformerWinding) ON (n.mrid)',
                'CREATE INDEX IF NOT EXISTS FOR (n:Feeder) ON (n.mrid)',
                'CREATE INDEX IF NOT EXISTS FOR (n:ConnectivityNode) ON (n.mrid)',
                'CREATE INDEX IF NOT EXISTS FOR (n:Terminal) ON (n.mrid)',
            ];
            for (const query of indexes) {
                await session.run(query);
            }
            console.log('[Neo4j] Indexes ensured');
        }
        finally {
            await session.close();
        }
    }
};
exports.Neo4jService = Neo4jService;
exports.Neo4jService = Neo4jService = __decorate([
    (0, common_1.Injectable)()
], Neo4jService);
//# sourceMappingURL=neo4j.service.js.map