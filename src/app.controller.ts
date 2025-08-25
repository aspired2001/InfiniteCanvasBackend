import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { EventLogService } from './event-log/event-log.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly eventLogService: EventLogService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('logs')
  getLogs(): any[] {
    return this.eventLogService.getLogs();
  }
}
