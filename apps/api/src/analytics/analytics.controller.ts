import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get high-level dashboard statistics' })
  async getDashboard() {
    return this.analyticsService.getDashboardStats();
  }
}
