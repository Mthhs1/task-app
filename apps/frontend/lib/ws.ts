// ============================================================================
// WebSocket Singleton Client
//
// Manages a single persistent WebSocket connection to the backend for
// real-time event delivery (task:created, task:updated, task:deleted, etc.).
// Handles reconnection with exponential backoff, message validation, and
// org-scoped event routing.
// ============================================================================

// wsMessageSchema: Zod discriminated union that validates incoming WS messages
// against the known event shapes (task:created, task:updated, task:deleted,
// comment:created, notification:new). Messages that don't match are discarded.
import { wsMessageSchema } from "@meu-projeto/types";
// WsMessage: the TypeScript type inferred from wsMessageSchema — represents
// any validated WebSocket event the backend can broadcast.
import type { WsMessage } from "@meu-projeto/types";

// ----------------------------------------------------------------------------
// deriveWsUrl — Determines the WebSocket endpoint URL based on environment
// ----------------------------------------------------------------------------
// Priority:
//   1. Explicit NEXT_PUBLIC_WS_URL env var (production override)
//   2. Browser window protocol (wss:// for HTTPS pages, ws:// for HTTP)
//   3. Hardcoded ws://localhost:3001 fallback (SSR or dev without window)
//
// The wss:// vs ws:// distinction is critical: browsers block ws:// on
// HTTPS pages (mixed-content security error).
function deriveWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window !== "undefined") {
    // We're in the browser — pick secure or insecure scheme based on page protocol
    const scheme = window.location.protocol === "https:" ? "wss" : "ws";
    return `${scheme}://${window.location.hostname}:3001`;
  }
  // SSR context (Node.js) — no window object, fallback to localhost
  return "ws://localhost:3001";
}

// WS_URL: computed once at module load time, reused for every connection attempt.
const WS_URL = deriveWsUrl();

// EventHandler: callback signature for subscribers. Each handler receives
// a schema-validated WsMessage. Subscribers register via onMessage().
type EventHandler = (message: WsMessage) => void;

// ============================================================================
// WsClient — Singleton class managing the WebSocket lifecycle
// ============================================================================
class WsClient {
  // socket: the underlying browser WebSocket instance. Null when disconnected.
  // Only one socket exists at a time (singleton pattern).
  private socket: WebSocket | null = null;

  // handlers: a Set of subscriber callbacks. Using a Set (not array) because:
  //   - We need unique handlers (no duplicate subscriptions)
  //   - O(1) add/delete (vs array splice)
  //   - The unsubscribe function returned by onMessage() calls handlers.delete()
  private handlers: Set<EventHandler> = new Set();

  // reconnectDelay: current delay before the next reconnection attempt (ms).
  // Starts at 1000ms and doubles after each failure (exponential backoff).
  // Resets to 1000ms on successful connection.
  private reconnectDelay = 1000;

  // maxReconnectDelay: ceiling for reconnectDelay — prevents waiting hours
  // after many consecutive failures. 30 seconds is a reasonable cap that
  // keeps the client responsive without hammering the server.
  private maxReconnectDelay = 30000;

  // reconnectTimer: reference to the pending setTimeout() for the next
  // reconnect attempt. Stored so disconnect() can cancel it — otherwise
  // a reconnect could fire after logout, creating a zombie connection.
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // intentionallyClosed: flag that distinguishes user-initiated disconnects
  // (logout, page unload) from network drops. When true, the onclose
  // handler skips scheduleReconnect(). Set by disconnect(), cleared by connect().
  private intentionallyClosed = false;

  // activeOrgId: the org the user is currently viewing. Sent to the server
  // after every (re)connection so the backend knows which org's events to
  // broadcast to this socket. Updated via switchOrg().
  private activeOrgId: string | null = null;

  // --------------------------------------------------------------------------
  // connect — Public entry point to start the WebSocket connection
  // --------------------------------------------------------------------------
  // Resets the "intentionally closed" flag (allows reconnection again),
  // resets the backoff delay to its starting value, and delegates to
  // connectInternal() for the actual socket creation.
  //
  // Called at app startup (after auth) and can be called again after
  // disconnect() (e.g., re-login).
  connect() {
    this.intentionallyClosed = false; // Allow reconnection on future drops
    this.reconnectDelay = 1000; // Reset backoff — fresh start
    this.connectInternal();
  }

  // --------------------------------------------------------------------------
  // connectInternal — Creates the WebSocket and wires up event handlers
  // --------------------------------------------------------------------------
  // This is the low-level connection logic, separated from connect() so
  // scheduleReconnect() can call it directly without resetting state.
  private connectInternal() {
    // SSR guard: WebSocket is a browser-only API. During Next.js SSR (Node.js),
    // `window` is undefined and `WebSocket` doesn't exist. Skip silently.
    if (typeof window === "undefined") return;

    // Guard against duplicate sockets: if a socket already exists and is
    // either OPEN or still in the CONNECTING (handshake) phase, don't create
    // a new one. Without this check, rapid connect() calls or overlapping
    // reconnects could spawn multiple sockets with dangling event handlers.
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    )
      return;

    // Build the WebSocket URL. Authentication relies on the session cookie
    // sent automatically by the browser during the HTTP upgrade handshake —
    // no token is passed in the URL (security: avoids leaking secrets in logs).
    const url = `${WS_URL}/ws`;

    try {
      // Create the WebSocket — this triggers the HTTP upgrade handshake.
      // The socket starts in CONNECTING state and transitions to OPEN
      // when the server responds with 101 Switching Protocols.
      this.socket = new WebSocket(url);

      // --------------------------------------------------------------------
      // onopen — fires when the upgrade handshake succeeds (state → OPEN)
      // --------------------------------------------------------------------
      this.socket.onopen = () => {
        // Reset backoff delay — this connection succeeded, so next failure
        // should start from 1s again, not from the accumulated delay.
        this.reconnectDelay = 1000;

        // If the user was viewing an org before reconnection, re-send the
        // switch_org event so the backend starts broadcasting that org's
        // events to this freshly-connected socket.
        if (this.activeOrgId) {
          this.send({ event: "switch_org", orgId: this.activeOrgId });
        }
      };

      // --------------------------------------------------------------------
      // onmessage — fires when a text or binary frame arrives from the server
      // --------------------------------------------------------------------
      this.socket.onmessage = (event) => {
        try {
          // Parse the raw text frame as JSON — event.data is a string
          // (text frames are UTF-8; the browser gives us a string, not bytes).
          const parsed = JSON.parse(event.data);

          // Validate the parsed object against the Zod discriminated union.
          // This ensures only well-formed WsMessages reach the handlers —
          // garbage data, wrong field types, or unknown event types are
          // rejected by Zod and discarded. This protects reconcileWs() from
          // receiving malformed payloads.
          const message = wsMessageSchema.parse(parsed);

          // Broadcast to all subscribers. Each handler is a callback
          // registered via onMessage() — the task store's reconcileWs
          // is the primary consumer.
          this.handlers.forEach((handler) => handler(message));
        } catch {
          // If JSON.parse or wsMessageSchema.parse throws, the message is
          // either not valid JSON or doesn't match the expected schema.
          // We silently discard it — bad data shouldn't crash the app.
        }
      };

      // --------------------------------------------------------------------
      // onclose — fires when the socket closes (either side or network drop)
      // --------------------------------------------------------------------
      this.socket.onclose = () => {
        // Only schedule a reconnect if this close was NOT intentional.
        // Intentional closes (logout, disconnect()) set the flag to true,
        // preventing an infinite reconnect loop after logout.
        if (!this.intentionallyClosed) {
          this.scheduleReconnect();
        }
      };

      // --------------------------------------------------------------------
      // onerror — fires on network errors (DNS failure, TLS issue, etc.)
      // --------------------------------------------------------------------
      // The browser doesn't expose the specific error reason — we only know
      // something went wrong. We force-close the socket, which triggers
      // onclose → scheduleReconnect (if not intentionally closed).
      this.socket.onerror = () => {
        this.socket?.close();
      };
    } catch {
      // If `new WebSocket(url)` throws (e.g., invalid URL, browser blocking),
      // schedule a reconnect attempt. This is rare but possible.
      this.scheduleReconnect();
    }
  }

  // --------------------------------------------------------------------------
  // scheduleReconnect — Schedules the next connection attempt with backoff
  // --------------------------------------------------------------------------
  // Called by onclose (unexpected drop) and by connectInternal's catch block.
  // Uses exponential backoff: delay doubles each time until maxReconnectDelay.
  private scheduleReconnect() {
    // Clear any previously scheduled reconnect — we only want one pending.
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.reconnectTimer = setTimeout(
      () => {
        // Double the delay for the next failure (exponential backoff):
        // 1s → 2s → 4s → 8s → 16s → 30s (capped by maxReconnectDelay)
        this.reconnectDelay = Math.min(
          this.reconnectDelay * 2,
          this.maxReconnectDelay,
        );

        // Attempt to reconnect — this creates a fresh WebSocket.
        this.connectInternal();
      },
      this.reconnectDelay,
    );
  }

  // --------------------------------------------------------------------------
  // disconnect — Intentionally closes the connection (logout, page unload)
  // --------------------------------------------------------------------------
  // This is the "clean shutdown" path. It:
  //   1. Sets intentionallyClosed = true → prevents onclose from reconnecting
  //   2. Cancels any pending reconnect timer
  //   3. Closes the socket and nulls the reference
  disconnect() {
    this.intentionallyClosed = true; // Flag: don't reconnect after close
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer); // Cancel pending
    this.reconnectTimer = null;
    this.socket?.close(); // Triggers onclose, but flag prevents reconnect
    this.socket = null; // Allow garbage collection
  }

  // --------------------------------------------------------------------------
  // onMessage — Subscribes a callback to incoming validated WS messages
  // --------------------------------------------------------------------------
  // handler: the callback to invoke when a validated WsMessage arrives.
  // Returns: an unsubscribe function — call it to remove the handler.
  //
  // This is the pub/sub pattern: components don't poll the WS directly,
  // they register interest via onMessage() and clean up when unmounted.
  // The returned function uses closure over `this.handlers` and `handler`
  // to safely remove the subscription.
  onMessage(handler: EventHandler): () => void {
    this.handlers.add(handler); // Register the subscriber

    // Return the unsubscribe function (for cleanup in useEffect):
    //   const unsub = wsClient.onMessage(myHandler);
    //   useEffect(() => unsub, []); // cleanup on unmount
    return () => {
      this.handlers.delete(handler);
    };
  }

  // --------------------------------------------------------------------------
  // switchOrg — Tells the server which org's events this client wants
  // --------------------------------------------------------------------------
  // orgId: the organization ID the user is now viewing.
  //
  // Sends a `{ event: "switch_org", orgId }` message to the server so
  // the backend's broadcast logic can route org-scoped events (task:created,
  // task:updated, etc.) to this socket. Also stores activeOrgId so that
  // reconnections automatically re-send the switch_org (onopen handler).
  switchOrg(orgId: string) {
    this.activeOrgId = orgId; // Persist for reconnection re-send
    this.send({ event: "switch_org", orgId }); // Notify server immediately
  }

  // --------------------------------------------------------------------------
  // send — Private helper to send a JSON message over the socket
  // --------------------------------------------------------------------------
  // Only sends if the socket is OPEN. If CONNECTING/CLOSING/CLOSED, the
  // message is silently dropped — the caller doesn't need to handle errors.
  // This is intentional: we don't want to throw in the middle of a reconnect.
  private send(data: Record<string, unknown>) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  // --------------------------------------------------------------------------
  // isConnected — Checks whether the socket is ready to send/receive
  // --------------------------------------------------------------------------
  // Returns true only if readyState === OPEN. Useful for UI to show
  // connection status indicators (e.g., "Reconnecting..." badge).
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

// Exported singleton instance — the entire app shares this one connection.
// Multiple consumers call wsClient.onMessage() without creating separate sockets.
export const wsClient = new WsClient();