import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const dateToUser = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

@Injectable()
export class EventLogService {
  private readonly eventLogs: any[] = [];

  log(eventName: string, payload: any) {
    const newLog = {
      event: eventName,
      timestamp: dateToUser(new Date().toISOString()),
      payload,
    };
    this.eventLogs.push(newLog);

    // Optional: Cap the log length to 100
    if (this.eventLogs.length > 100) {
      this.eventLogs.shift();
    }
  }

  getLogs() {
    return this.eventLogs;
  }

  clearLogs() {
    this.eventLogs.length = 0;
  }
}
