import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhiteboardGateway } from './whiteboard/whiteboard.gateway';
import { ConfigModule } from '@nestjs/config';
import { EventLogService } from './event-log/event-log.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [AppService, WhiteboardGateway, EventLogService],
})
export class AppModule {}
