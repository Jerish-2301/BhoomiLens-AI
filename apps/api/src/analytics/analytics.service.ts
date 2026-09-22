import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DatabaseService) {}

  async getDashboardStats() {
    const docs = await this.db.getAll('documents');
    const records = await this.db.getAll<any>('landRecords');
    const tasks = await this.db.getAll<any>('verificationTasks');
    const conflicts = await this.db.getAll<any>('recordConflicts');

    const totalDocs = docs.length;
    const verifiedRecords = records.filter((r) => r.status === 'VERIFIED').length;
    const pendingTasks = tasks.filter((t) => t.status === 'PENDING').length;
    const activeConflicts = conflicts.filter((c) => !c.resolved).length;

    // Trend data for analytics charts
    const weeklyUploads = [
      { name: 'Mon', count: 120 },
      { name: 'Tue', count: 230 },
      { name: 'Wed', count: 310 },
      { name: 'Thu', count: 280 },
      { name: 'Fri', count: 420 },
      { name: 'Sat', count: 150 },
      { name: 'Sun', count: 90 },
    ];

    return {
      stats: {
        totalDocs,
        verifiedRecords,
        pendingTasks,
        conflicts: activeConflicts,
      },
      charts: {
        weeklyUploads,
      },
    };
  }
}
