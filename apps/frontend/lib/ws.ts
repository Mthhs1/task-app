import type { WsMessage } from "@meu-projeto/types";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== "undefined"
    ? `ws://${window.location.hostname}:3001`
    : "ws://localhost:3001");

type EventHandler = (message: WsMessage) => void;

class WsClient {
  private socket: WebSocket | null = null;
  private handlers: Set<EventHandler> = new Set();
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private token: string | null = null;
  private activeOrgId: string | null = null;

  connect(token: string) {
    this.token = token;
    this.reconnectDelay = 1000;
    this.connectInternal();
  }

  private connectInternal() {
    if (typeof window === "undefined") return;
    if (this.socket?.readyState === WebSocket.OPEN) return;

    const url = this.token
      ? `${WS_URL}/ws?token=${encodeURIComponent(this.token)}`
      : `${WS_URL}/ws`;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.reconnectDelay = 1000;
        if (this.activeOrgId) {
          this.send({ event: "switch_org", orgId: this.activeOrgId });
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WsMessage;
          this.handlers.forEach((handler) => handler(message));
        } catch {
          // ignore malformed messages
        }
      };

      this.socket.onclose = () => {
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.socket?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 2,
        this.maxReconnectDelay,
      );
      this.connectInternal();
    }, this.reconnectDelay);
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.close();
    this.socket = null;
  }

  onMessage(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  switchOrg(orgId: string) {
    this.activeOrgId = orgId;
    this.send({ event: "switch_org", orgId });
  }

  private send(data: Record<string, unknown>) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new WsClient();
