import mqtt, { MqttClient } from "mqtt";

let client: MqttClient | null = null;

export function initMqtt(brokerUrl: string) {
  client = mqtt.connect(brokerUrl);
  client.on("connect", () => {
    console.log("[MQTT] Connected to", brokerUrl);
  });
  client.on("error", (err) => {
    console.error("[MQTT] Error:", err);
  });
  return client;
}

export function publish(topic: string, payload: any, opts?: mqtt.IClientPublishOptions) {
  if (!client) {
    console.warn("[MQTT] Not connected, dropping message");
    return;
  }
  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  client.publish(topic, data, { qos: 1, retain: false, ...opts });
}