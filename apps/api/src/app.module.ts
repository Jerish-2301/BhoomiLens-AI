import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { EventsModule } from './events/events.module';
import { ProcessingModule } from './processing/processing.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FirebaseModule } from './firebase/firebase.module';
import { DatabaseModule } from './database/database.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuditModule } from './audit/audit.module';
import { IntegrationModule } from './integration/integration.module';

@Module({
  imports: [FirebaseModule, DatabaseModule, EventEmitterModule.forRoot(), UsersModule, AuthModule, EventsModule, ProcessingModule, DocumentsModule, AnalyticsModule, AuditModule, IntegrationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
