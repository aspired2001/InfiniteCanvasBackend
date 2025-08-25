# ExClone Server Documentation

## Project Overview

ExClone Server is a real-time collaborative whiteboard application built with NestJS and Socket.IO. It provides a foundation for real-time drawing and collaboration features.

## Project Structure

```
exclone-server/
├── src/
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── app.module.ts
│   ├── main.ts
│   ├── whiteboard/
│   │   └── whiteboard.gateway.ts
│   └── event-log/
│       └── event-log.service.ts
├── test/
├── dist/
└── configuration files
```

## Key Components

### 1. Whiteboard Gateway (`whiteboard.gateway.ts`)

The core component handling real-time whiteboard operations using WebSockets.

#### Features:

- Real-time object synchronization
- Object addition, modification, and removal
- Canvas clearing
- Client connection/disconnection handling

#### WebSocket Events:

- `object:added` - When a new object is added to the whiteboard
- `object:modified` - When an existing object is modified
- `object:removed` - When an object is removed
- `canvas:clear` - When the canvas is cleared
- `object:sync` - Initial synchronization of objects for new clients

### 2. Event Log Service (`event-log.service.ts`)

Service for logging and tracking whiteboard events.

#### Features:

- Event logging with timestamps
- Log retrieval
- Log clearing
- Automatic log capping (100 entries)

### 3. Application Module (`app.module.ts`)

Main application module that ties all components together.

#### Dependencies:

- ConfigModule for environment configuration
- WhiteboardGateway for WebSocket functionality
- EventLogService for event tracking

## Technical Stack

- **Framework**: NestJS
- **WebSocket**: Socket.IO
- **Language**: TypeScript
- **Date Handling**: DayJS

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run start:dev
```

3. The server will run on `http://localhost:3000`

## API Endpoints

### WebSocket Events

#### Client to Server:

- `object:added` - Add a new object
- `object:modified` - Modify an existing object
- `object:removed` - Remove an object
- `canvas:clear` - Clear the canvas

#### Server to Client:

- `object:sync` - Initial object synchronization
- `object:added` - Broadcast new object
- `object:modified` - Broadcast object modification
- `object:removed` - Broadcast object removal
- `canvas:clear` - Broadcast canvas clearing

## Data Structures

### WhiteboardObject

```typescript
type WhiteboardObject = {
  id: string;
  props: Record<string, unknown>;
  [key: string]: unknown;
};
```

## Best Practices

1. **Error Handling**: Implement proper error handling for WebSocket events
2. **Security**: Enable CORS only in development
3. **Performance**: Use efficient data structures for object storage
4. **Scalability**: Consider implementing persistent storage for production

## Future Improvements

1. Implement persistent storage for whiteboard objects
2. Add user authentication
3. Implement room-based collaboration
4. Add object versioning
5. Implement undo/redo functionality
