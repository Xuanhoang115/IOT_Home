// ============================================================================
// DIRECT CLOUD MQTT-OVER-WEBSOCKET CLIENT (ZERO-DEPENDENCY NATIVE WEBSOCKET)
// Kết nối trực tiếp từ Trình duyệt Web / Mobile lên EMQX Cloud Serverless (WSS :8084)
// Giúp hệ thống chạy 100% thời gian thực (< 40ms) KỂ CẢ KHI ĐÃ TẮT BACKEND SERVER!
// ============================================================================

const EMQX_WSS_URL =
  process.env.EXPO_PUBLIC_MQTT_WSS_URL ||
  'wss://u1a4013a.ala.eu-central-1.emqxsl.com:8084/mqtt';
const EMQX_USER = process.env.EXPO_PUBLIC_MQTT_USERNAME || 'smarthome_esp32';
const EMQX_PASS = process.env.EXPO_PUBLIC_MQTT_PASSWORD || 'admin123';
const HOME_ID = process.env.EXPO_PUBLIC_HOME_ID || 'home1';

type MqttMessageHandler = (topic: string, payload: Record<string, unknown>, isRetained: boolean) => void;
type MqttConnectionHandler = (connected: boolean) => void;

function encodeUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function encodeMqttString(str: string): Uint8Array {
  const bytes = encodeUtf8(str);
  const out = new Uint8Array(2 + bytes.length);
  out[0] = (bytes.length >> 8) & 0xff;
  out[1] = bytes.length & 0xff;
  out.set(bytes, 2);
  return out;
}

function encodeRemainingLength(len: number): number[] {
  const bytes: number[] = [];
  let x = len;
  do {
    let encodedByte = x % 128;
    x = Math.floor(x / 128);
    if (x > 0) {
      encodedByte |= 128;
    }
    bytes.push(encodedByte);
  } while (x > 0);
  return bytes;
}

function buildPacket(headerByte: number, bodyParts: Uint8Array[]): Uint8Array {
  let totalLen = 0;
  for (const p of bodyParts) totalLen += p.length;
  const remBytes = encodeRemainingLength(totalLen);
  const packet = new Uint8Array(1 + remBytes.length + totalLen);
  packet[0] = headerByte;
  for (let i = 0; i < remBytes.length; i++) {
    packet[1 + i] = remBytes[i]!;
  }
  let offset = 1 + remBytes.length;
  for (const p of bodyParts) {
    packet.set(p, offset);
    offset += p.length;
  }
  return packet;
}

export class DirectCloudMqttService {
  private ws: WebSocket | null = null;
  private connected = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private onMessageCb: MqttMessageHandler | null = null;
  private onConnCb: MqttConnectionHandler | null = null;
  private packetId = 1;

  public start(
    onMessage: MqttMessageHandler,
    onConnectionChange?: MqttConnectionHandler
  ): void {
    this.onMessageCb = onMessage;
    this.onConnCb = onConnectionChange ?? null;
    this.connect();
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public stop(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.pingTimer = null;
    this.reconnectTimer = null;
    this.connected = false;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  public publishJson(topicSuffix: string, payloadObj: unknown): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.connected) {
      return false;
    }
    const fullTopic = topicSuffix.startsWith('smarthome/')
      ? topicSuffix
      : `smarthome/${HOME_ID}/${topicSuffix}`;
    const topicBytes = encodeMqttString(fullTopic);
    const payloadBytes = encodeUtf8(JSON.stringify(payloadObj));
    // QoS 0, retain = false (0x30)
    const packet = buildPacket(0x30, [topicBytes, payloadBytes]);
    try {
      this.ws.send(packet);
      return true;
    } catch {
      return false;
    }
  }

  private connect(): void {
    if (typeof WebSocket === 'undefined') return;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }

    try {
      const ws = new WebSocket(EMQX_WSS_URL, 'mqtt');
      ws.binaryType = 'arraybuffer';
      this.ws = ws;

      ws.onopen = () => {
        const clientId = `web_${HOME_ID}_${Math.random().toString(16).slice(2, 8)}`;
        // Variable header: Protocol Name "MQTT" (0, 4, 'M','Q','T','T'), Level 4, Flags 0xC2 (User+Pass+Clean), KeepAlive 25s
        const varHeader = new Uint8Array([
          0x00, 0x04, 0x4d, 0x51, 0x54, 0x54,
          0x04,
          0xc2,
          0x00, 0x19,
        ]);
        const connectPacket = buildPacket(0x10, [
          varHeader,
          encodeMqttString(clientId),
          encodeMqttString(EMQX_USER),
          encodeMqttString(EMQX_PASS),
        ]);
        ws.send(connectPacket);
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!(event.data instanceof ArrayBuffer)) return;
        this.handleIncomingBuffer(new Uint8Array(event.data));
      };

      ws.onclose = () => {
        this.handleDisconnect();
      };

      ws.onerror = () => {
        // onclose will handle reconnect
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private handleDisconnect(): void {
    const wasConnected = this.connected;
    this.connected = false;
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (wasConnected && this.onConnCb) {
      this.onConnCb(false);
    }
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 4000);
  }

  private subscribeAll(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const pid = this.packetId++ & 0xffff || 1;
    const pidBytes = new Uint8Array([(pid >> 8) & 0xff, pid & 0xff]);
    const topicFilter = encodeMqttString(`smarthome/${HOME_ID}/#`);
    const qosByte = new Uint8Array([0x00]);
    const subPacket = buildPacket(0x82, [pidBytes, topicFilter, qosByte]);
    this.ws.send(subPacket);
  }

  private handleIncomingBuffer(buf: Uint8Array): void {
    let offset = 0;
    const decoder = new TextDecoder();

    while (offset < buf.length) {
      const header = buf[offset]!;
      const packetType = (header >> 4) & 0x0f;
      const isRetained = (header & 0x01) === 1;
      const qos = (header >> 1) & 0x03;

      // Decode remaining length
      let multiplier = 1;
      let remLen = 0;
      let idx = offset + 1;
      while (idx < buf.length) {
        const b = buf[idx++]!;
        remLen += (b & 127) * multiplier;
        multiplier *= 128;
        if ((b & 128) === 0) break;
      }

      const packetEnd = idx + remLen;
      if (packetEnd > buf.length) break;

      if (packetType === 2) {
        // CONNACK
        const returnCode = buf[idx + 1];
        if (returnCode === 0) {
          this.connected = true;
          if (this.onConnCb) this.onConnCb(true);
          this.subscribeAll();
          if (this.pingTimer) clearInterval(this.pingTimer);
          this.pingTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(new Uint8Array([0xc0, 0x00])); // PINGREQ
            }
          }, 18000);
        }
      } else if (packetType === 3) {
        // PUBLISH
        const topicLen = ((buf[idx]! << 8) | buf[idx + 1]!) & 0xffff;
        const topicStart = idx + 2;
        const topic = decoder.decode(buf.subarray(topicStart, topicStart + topicLen));
        let payloadStart = topicStart + topicLen;
        if (qos > 0) {
          payloadStart += 2; // Packet Identifier
        }
        const rawJson = decoder.decode(buf.subarray(payloadStart, packetEnd));
        try {
          const parsed = JSON.parse(rawJson) as Record<string, unknown>;
          if (this.onMessageCb) {
            this.onMessageCb(topic, parsed, isRetained);
          }
        } catch {
          // ignore invalid JSON
        }
      }

      offset = packetEnd;
    }
  }
}

export const directCloudMqtt = new DirectCloudMqttService();
