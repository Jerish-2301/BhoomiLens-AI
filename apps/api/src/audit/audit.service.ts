import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { randomUUID } from 'crypto';

export interface AuditLogEntry {
  id: string;
  action: string;
  resourceId?: string;
  resourceType?: string;
  userId?: string;
  user?: string;
  metadata?: string;
  timestamp: Date;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly db: DatabaseService) {}

  async logEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    const logId = randomUUID();
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: logId,
      timestamp: new Date(),
    };

    try {
      await this.db.set('auditLogs', fullEntry);
      this.logger.log(`Audit event recorded: ${entry.action}`);
    } catch (error) {
      this.logger.error(`Failed to record audit event: ${entry.action}`, error);
    }
  }
}
