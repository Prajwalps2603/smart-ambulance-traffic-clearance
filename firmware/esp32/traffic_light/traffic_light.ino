/*
  Traffic Light Controller (ESP32) - Prototype
  - Subscribes to "traffic/all/command"
  - On AMBULANCE_PREEMPTION: set main lane GREEN, others RED (simulate by LEDs)
  - On NORMAL_OPERATION: cycles normal phases

  Hardware:
  - GREEN LED: GPIO 16
  - YELLOW LED: GPIO 17
  - RED LED: GPIO 18
*/

#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* MQTT_HOST = "192.168.62.205"; // your machine IP or broker IP
const uint16_t MQTT_PORT = 1883;

WiFiClient espClient;
PubSubClient client(espClient);

const int GREEN_PIN = 16;
const int YELLOW_PIN = 17;
const int RED_PIN = 18;

enum Phase { NORMAL, PREEMPTION };
Phase currentPhase = NORMAL;

unsigned long lastChange = 0;
int normalState = 0;

void setLights(bool r, bool y, bool g) {
  digitalWrite(RED_PIN, r ? HIGH : LOW);
  digitalWrite(YELLOW_PIN, y ? HIGH : LOW);
  digitalWrite(GREEN_PIN, g ? HIGH : LOW);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i=0; i<length; i++) msg += (char)payload[i];
  Serial.print("[MQTT] Topic: "); Serial.print(topic);
  Serial.print(" | Message: "); Serial.println(msg);

  if (msg.indexOf("\"phase\":\"AMBULANCE_PREEMPTION\"") >= 0) {
    currentPhase = PREEMPTION;
    setLights(false, false, true); // GREEN
    Serial.println("[TRAFFIC] Preemption: GREEN for ambulance lane");
  } else if (msg.indexOf("\"phase\":\"NORMAL_OPERATION\"") >= 0) {
    currentPhase = NORMAL;
    lastChange = millis();
    normalState = 0;
    Serial.println("[TRAFFIC] Normal operation resumed");
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("[MQTT] Attempting connection...");
    String clientId = "TrafficLight-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      client.subscribe("traffic/all/command");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 3 seconds");
      delay(3000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(RED_PIN, OUTPUT);
  pinMode(YELLOW_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  setLights(true, false, false); // start RED

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("[WiFi] Connecting");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n[WiFi] Connected. IP: " + WiFi.localIP().toString());

  client.setServer(MQTT_HOST, MQTT_PORT);
  client.setCallback(mqttCallback);
  lastChange = millis();
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  if (currentPhase == NORMAL) {
    unsigned long now = millis();
    if (now - lastChange > 3000) {
      lastChange = now;
      normalState = (normalState + 1) % 4;
      switch (normalState) {
        case 0: setLights(true, false, false); break;  // RED
        case 1: setLights(false, true, false); break;  // YELLOW
        case 2: setLights(false, false, true); break;  // GREEN
        case 3: setLights(false, true, false); break;  // YELLOW
      }
    }
  }
}