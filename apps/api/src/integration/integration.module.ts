import { Module } from '@nestjs/common';
import { GovtIntegrationService } from './integration.service';

@Module({
  providers: [GovtIntegrationService],
  exports: [GovtIntegrationService],
})
export class IntegrationModule {}
