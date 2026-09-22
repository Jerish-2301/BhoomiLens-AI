import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  emitDocumentStatusUpdate(documentId: string, status: string, message?: string) {
    this.server.emit('document.status', { documentId, status, message });
  }

  emitRecordConflict(recordId: string, message: string) {
    this.server.emit('record.conflict', { recordId, message });
  }
}
