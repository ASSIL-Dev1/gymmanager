import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { AppController } from './app.controller';
import { DatabaseService } from './database.service';

function validateConfiguration(config: Record<string, unknown>): Record<string, unknown> {
  for (const name of ['POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_HOST']) {
    if (typeof config[name] !== 'string' || config[name] === '') {
      throw new Error('Configuration manquante pour ' + name + '. Créez le fichier .env à la racine du projet.');
    }
  }
  for (const name of ['POSTGRES_PORT', 'API_PORT']) {
    const port = Number(config[name]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(name + ' doit être un port compris entre 1 et 65535.');
    }
    config[name] = port;
  }
  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, '../../.env'),
      validate: validateConfiguration,
    }),
  ],
  controllers: [AppController],
  providers: [DatabaseService],
})
export class AppModule {}
