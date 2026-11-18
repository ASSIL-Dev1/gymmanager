import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Controller()
export class AppController {
  constructor(private readonly database: DatabaseService) {}

  @Get('health')
  async health(): Promise<{ status: 'ok'; database: 'available' }> {
    try {
      await this.database.checkConnection();
      return { status: 'ok', database: 'available' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        database: 'unavailable',
      });
    }
  }
}
