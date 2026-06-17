import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import neo4j, { Driver, Session } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private driver: Driver;

  async onModuleInit() {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'neo4j123';

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionLifetime: 3 * 60 * 60 * 1000,
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 2 * 60 * 1000,
    });

    try {
      await this.driver.verifyConnectivity();
      console.log('[Neo4j] Connected successfully');
      await this.createIndexes();
    } catch (e) {
      console.warn('[Neo4j] Connection failed, running in mock mode:', e.message);
    }
  }

  async onModuleDestroy() {
    if (this.driver) {
      await this.driver.close();
    }
  }

  getSession(): Session {
    return this.driver.session();
  }

  getDriver(): Driver {
    return this.driver;
  }

  private async createIndexes() {
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
    } finally {
      await session.close();
    }
  }
}
