# Smart Ambulance Traffic Clearance System (Prototype)

A full-stack prototype to demonstrate:
- Ambulance mission orchestration
- Real-time lane clearance alerts via roadside Smart Poles (MQTT)
- Traffic light preemption along ambulance route
- Control Center via logs and Socket.IO events
- Mobile App (Flutter) to start a mission and stream live location

This prototype is built to be locally runnable and IoT-friendly with minimal setup.

## Architecture

- Mobile App (Flutter)
  - Start mission by entering destination (hospital)
  - Streams ambulance GPS location to backend
- Backend (Node.js, Express, Socket.IO, MQTT)
  - Manages missions (start, live updates, completion)
  - Computes naive ETA or calls Google Directions (optional)
  - Publishes alerts for Smart Poles (MQTT)
  - Publishes traffic light commands (MQTT)
  - Emits real-time events to Control Center (Socket.IO)
- IoT Firmware (ESP32, Arduino framework)
  - Smart Pole: listens for alert topics and plays audio + shows LED direction
  - Traffic Light: listens for traffic commands and changes LED states via relays or pins
- Infra (Docker)
  - Eclipse Mosquitto for MQTT broker
  - Backend service

## MQTT Topics (Prototype)

- Alerts to smart poles
  - `alerts/all`
  - Payload example:
    ```json
    {
      "type": "AMBULANCE_ALERT",
      "missionId": "abc-123",
      "etaSeconds": 240,
      "distanceMeters": 1500,
      "direction": "STRAIGHT",
      "message": "Ambulance approaching, clear one lane",
      "timestamp": 1710000000
    }
    ```

- Traffic light commands
  - `traffic/all/command`
  - Payload example:
    ```json
    {
      "type": "SET_PHASE",
      "missionId": "abc-123",
      "phase": "AMBULANCE_PREEMPTION",
      "durationSeconds": 60,
      "timestamp": 1710000000
    }
    ```

## Quick Start

1) Prerequisites
- Docker and Docker Compose
- Node.js 20+ (if running backend without Docker)
- Flutter 3.x (for mobile app)
- An ESP32 board (optional for firmware test) or use Serial Monitor for logs

2) Start Infra (MQTT + Backend)
- Copy `apps/backend/.env.example` to `apps/backend/.env` and review
- Run:
  ```bash
  docker compose -f infra/docker-compose.yml up --build
  ```
- Backend will be available at `http://localhost:8080`
- Socket.IO endpoint: `ws://localhost:8080`

3) Test Backend
- Start a mission:
  ```bash
  curl -X POST http://localhost:8080/api/v1/missions/start \
    -H "Content-Type: application/json" \
    -d '{
      "vehicleId":"AMB-001",
      "origin":{"lat":12.9716,"lng":77.5946},
      "destination":{"lat":12.9352,"lng":77.6245},
      "hospitalName":"St. John'\''s Medical College Hospital"
    }'
  ```
- Update ambulance location:
  ```bash
  curl -X POST http://localhost:8080/api/v1/missions/AMB-001/location \
    -H "Content-Type: application/json" \
    -d '{"lat":12.965, "lng":77.61, "speedKph":40}'
  ```

4) Run Mobile App (optional)
- See `apps/mobile/flutter` folder. Update `API_BASE_URL` in `lib/config.dart` if needed.
- Run on emulator or device:
  ```bash
  flutter pub get
  flutter run
  ```

5) Flash ESP32 Firmware
- Open `firmware/esp32/smart_pole/smart_pole.ino` in Arduino IDE or PlatformIO
- Update WiFi SSID/PASSWORD and MQTT broker host (use your machine IP if ESP32 is on same LAN)
- Flash and open Serial Monitor @115200 to see alerts
- Repeat for `firmware/esp32/traffic_light/traffic_light.ino`

## Notes

- This is a prototype; actual deployments require secure auth (JWT/MTLS), intersection detection, precise geofencing, and integration with traffic controllers.
- Directions API is optional; by default, backend computes a naive ETA based on distance and speed.
- You can replace `alerts/all` and `traffic/all/command` with granular topics per pole/intersection in a production design.

## License

MIT