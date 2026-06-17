import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Driver, Session } from 'neo4j-driver';
export declare class Neo4jService implements OnModuleInit, OnModuleDestroy {
    private driver;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    getSession(): Session;
    getDriver(): Driver;
    private createIndexes;
}
