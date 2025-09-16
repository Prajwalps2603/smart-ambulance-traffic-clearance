/*
  Smart Pole (ESP32) - Prototype
  - Connects to WiFi and MQTT
  - Subscribes to alerts on topic "alerts/all"
  - On AMBULANCE_ALERT: prints to Serial, blinks LED, plays buzzer
  - On CLEAR: stops alerts

  Hardware:
  - LED on GPIO 2 (builtin on some boards)
  - Buzzer on GPIO 15 (active buzzer recommended) - optional
*/

#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* MQTT_HOST = "192.168.62.205"; // your machine IP or broker IPconst uint16_t MQTT_PORT = 1883;

WiFiClient espClient;
PubSubClient client(espClient);

const int LED_PIN = 2;
const int BUZZER_PIN = 15;

bool alertActive = false;
unsigned long lastBlink = 0;
bool ledState = false;

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i=0; i<length; i++) msg += (char)payload[i];
  Serial.print("[MQTT] Topic: "); Serial.print(topic);
  Serial.print(" | Message: "); Serial.println(msg);

  if (msg.indexOf("\"type\":\"AMBULANCE_ALERT\"") >= 0) {
    alertActive = true;
    tone(BUZZER_PIN, 2000, 200); // short beep
  } else if (msg.indexOf("\"type\":\"CLEAR\"") >= 0) {
    alertActive = false;
    digitalWrite(LED_PIN, LOW);
    noTone(BUZZER_PIN);
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("[MQTT] Attempting connection...");
    String clientId = "SmartPole-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      client.subscribe("alerts/all");
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
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("[WiFi] Connecting");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n[WiFi] Connected. IP: " + WiFi.localIP().toString());

  client.setServer(MQTT_HOST, MQTT_PORT);
  client.setCallback(mqttCallback);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  if (alertActive) {
    unsigned long now = millis();
    if (now - lastBlink > 500) {
      lastBlink = now;
      ledState = !ledState;
      digitalWrite(LED_PIN, ledState ? HIGH : LOW);
      // periodic beep
      if (ledState) tone(BUZZER_PIN, 2000, 150);
    }
  }
}