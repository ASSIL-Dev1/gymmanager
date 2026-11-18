import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(config: ConfigService) {
    this.pool = new Pool({
      host: config.getOrThrow<string>('POSTGRES_HOST'),
      port: config.getOrThrow<number>('POSTGRES_PORT'),
      user: config.getOrThrow<string>('POSTGRES_USER'),
      password: config.getOrThrow<string>('POSTGRES_PASSWORD'),
      database: config.getOrThrow<string>('POSTGRES_DB'),
      connectionTimeoutMillis: 3000,
      query_timeout: 3000,
      max: 5,
    });
    this.pool.on('error', () => {
      this.logger.warn('Une connexion PostgreSQL est devenue indisponible.');
    });
  }

  async checkConnection(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
