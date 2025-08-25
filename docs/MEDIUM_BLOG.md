# Building a Real-Time Collaborative Whiteboard with NestJS and Socket.IO

## Introduction

In this article, we'll explore how to build a real-time collaborative whiteboard application using NestJS and Socket.IO. This project demonstrates how to create a robust backend for a collaborative drawing application where multiple users can draw simultaneously and see each other's changes in real-time.

## Prerequisites

Before we begin, make sure you have:

- Node.js installed (v14 or higher)
- Basic knowledge of TypeScript
- Understanding of WebSocket concepts
- Familiarity with NestJS framework

## Project Setup

Let's start by creating a new NestJS project:

```bash
npm i -g @nestjs/cli
nest new exclone-server
cd exclone-server
```

## Core Components

Our application consists of two main components:

1. Whiteboard Gateway - Handles real-time drawing operations
2. Event Log Service - Tracks and logs all whiteboard events

### 1. Whiteboard Gateway

The `WhiteboardGateway` is the heart of our application. It handles all real-time communication between clients. Here's the complete implementation:

```typescript
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventLogService } from '../event-log/event-log.service';

type WhiteboardObject = {
  id: string;
  props: Record<string, unknown>;
  [key: string]: unknown;
};

@WebSocketGateway({ cors: true })
export class WhiteboardGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly eventLogService: EventLogService) {}

  private objects: Record<string, WhiteboardObject> = {};

  handleConnection(client: Socket) {
    this.eventLogService.log('client:connected', { clientId: client.id });
    this.eventLogService.log('client:syncing', {
      objects: Object.values(this.objects),
    });
    console.log('client:connected and syncing', { clientId: client.id });
    client.emit('object:sync', { objects: Object.values(this.objects) });
  }

  handleDisconnect(client: Socket) {
    this.eventLogService.log('client:disconnected', { clientId: client.id });
    console.log('client:disconnected', { clientId: client.id });
  }

  @SubscribeMessage('object:added')
  handleObjectAdded(
    @MessageBody() data: WhiteboardObject,
    @ConnectedSocket() client: Socket,
  ) {
    this.eventLogService.log('object:added', data);
    this.objects[data.id] = data;
    client.broadcast.emit('object:added', data);
  }

  @SubscribeMessage('object:modified')
  handleObjectModified(
    @MessageBody() data: WhiteboardObject,
    @ConnectedSocket() client: Socket,
  ) {
    this.eventLogService.log('object:modified', data);
    if (this.objects[data.id]) {
      this.objects[data.id] = {
        ...this.objects[data.id],
        props: {
          ...this.objects[data.id].props,
          ...data.props,
        },
      };
      client.broadcast.emit('object:modified', data);
    }
  }

  @SubscribeMessage('object:removed')
  handleObjectRemoved(
    @MessageBody() data: WhiteboardObject,
    @ConnectedSocket() client: Socket,
  ) {
    this.eventLogService.log('object:removed', data);
    delete this.objects[data.id];
    client.broadcast.emit('object:removed', data);
  }

  @SubscribeMessage('canvas:clear')
  handleCanvasClear(@ConnectedSocket() client: Socket) {
    this.eventLogService.log('canvas:clear', {});
    this.objects = {};
    client.broadcast.emit('canvas:clear');
  }
}
```

Key points about the Whiteboard Gateway:

- Uses `@WebSocketGateway` decorator to enable WebSocket functionality
- Implements `OnGatewayConnection` and `OnGatewayDisconnect` for connection handling
- Maintains an in-memory store of whiteboard objects
- Handles four main operations: add, modify, remove, and clear
- Uses Socket.IO's broadcast feature to notify other clients

### 2. Event Log Service

The `EventLogService` helps us track and debug whiteboard events:

```typescript
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
```

Key features of the Event Log Service:

- Uses DayJS for timestamp formatting
- Maintains a capped log of 100 entries
- Provides methods for logging, retrieving, and clearing logs

### 3. Application Module

The `AppModule` ties everything together:

```typescript
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
```

## WebSocket Events

Our application uses several WebSocket events for communication:

### Client to Server Events:

- `object:added` - Add a new drawing object
- `object:modified` - Modify an existing object
- `object:removed` - Remove an object
- `canvas:clear` - Clear the entire canvas

### Server to Client Events:

- `object:sync` - Initial object synchronization for new clients
- `object:added` - Notify about new objects
- `object:modified` - Notify about object modifications
- `object:removed` - Notify about object removals
- `canvas:clear` - Notify about canvas clearing

## Data Structure

The `WhiteboardObject` type defines the structure of our drawing objects:

```typescript
type WhiteboardObject = {
  id: string;
  props: Record<string, unknown>;
  [key: string]: unknown;
};
```

This flexible structure allows us to store various types of drawing objects with different properties.

## Running the Application

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run start:dev
```

3. The server will run on `http://localhost:3000`

## Best Practices and Considerations

1. **Error Handling**: Always implement proper error handling for WebSocket events
2. **Security**: Enable CORS only in development; implement proper authentication for production
3. **Performance**: Use efficient data structures and consider implementing object batching
4. **Scalability**: For production, consider implementing persistent storage

## Future Improvements

1. **Persistent Storage**: Implement database storage for whiteboard objects
2. **User Authentication**: Add user authentication and authorization
3. **Room-based Collaboration**: Implement separate rooms for different whiteboards
4. **Object Versioning**: Add version control for objects
5. **Undo/Redo**: Implement undo/redo functionality

## Conclusion

In this article, we've built a real-time collaborative whiteboard backend using NestJS and Socket.IO. The implementation demonstrates how to handle real-time drawing operations, maintain object state, and synchronize changes across multiple clients.

The code is structured to be maintainable and extensible, making it easy to add new features or modify existing ones. While this implementation uses in-memory storage, it can be extended to use persistent storage for production use.

Feel free to experiment with the code and add your own features. Happy coding!
