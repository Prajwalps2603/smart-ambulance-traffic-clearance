import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'config.dart';

void main() {
  runApp(const SmartAmbulanceApp());
}

class SmartAmbulanceApp extends StatelessWidget {
  const SmartAmbulanceApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Smart Ambulance',
      theme: ThemeData(primarySwatch: Colors.red),
      home: const MissionScreen(),
    );
  }
}

class MissionScreen extends StatefulWidget {
  const MissionScreen({super.key});
  @override
  State<MissionScreen> createState() => _MissionScreenState();
}

class _MissionScreenState extends State<MissionScreen> {
  final _vehicleIdCtl = TextEditingController(text: "AMB-001");
  final _hospitalCtl = TextEditingController(text: "City Hospital");
  final _destLatCtl = TextEditingController(text: "12.9716");
  final _destLngCtl = TextEditingController(text: "77.5946");

  bool _missionActive = false;
  Timer? _timer;
  String _status = "Idle";

  Future<Position> _determinePosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) throw Exception('Location services are disabled.');
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.deniedForever) {
      throw Exception('Location permissions are permanently denied.');
    }
    return await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
  }

  Future<void> _startMission() async {
    try {
      setState(() => _status = "Starting mission...");
      final pos = await _determinePosition();
      final destLat = double.tryParse(_destLatCtl.text.trim()) ?? pos.latitude;
      final destLng = double.tryParse(_destLngCtl.text.trim()) ?? pos.longitude;
      final resp = await http.post(
        Uri.parse('$API_BASE_URL/api/v1/missions/start'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          "vehicleId": _vehicleIdCtl.text.trim(),
          "origin": {"lat": pos.latitude, "lng": pos.longitude},
          "destination": {"lat": destLat, "lng": destLng},
          "hospitalName": _hospitalCtl.text.trim()
        }),
      );
      if (resp.statusCode == 200) {
        setState(() {
          _missionActive = true;
          _status = "Mission started";
        });
        _startLocationStreaming();
      } else {
        setState(() => _status = "Failed: ${resp.body}");
      }
    } catch (e) {
      setState(() => _status = "Error: $e");
    }
  }

  void _startLocationStreaming() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) async {
      try {
        final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
        final speedKph = (pos.speed) * 3.6;
        final url = Uri.parse('$API_BASE_URL/api/v1/missions/${_vehicleIdCtl.text.trim()}/location');
        final resp = await http.post(url,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({"lat": pos.latitude, "lng": pos.longitude, "speedKph": speedKph})
        );
        if (resp.statusCode == 200) {
          setState(() => _status = "Streaming location... ETA updated");
        } else {
          setState(() => _status = "Update failed: ${resp.statusCode}");
        }
      } catch (e) {
        setState(() => _status = "Location error: $e");
      }
    });
  }

  Future<void> _completeMission() async {
    _timer?.cancel();
    try {
      final resp = await http.post(
        Uri.parse('$API_BASE_URL/api/v1/missions/${_vehicleIdCtl.text.trim()}/complete')
      );
      if (resp.statusCode == 200) {
        setState(() {
          _missionActive = false;
          _status = "Mission completed";
        });
      } else {
        setState(() => _status = "Complete failed: ${resp.body}");
      }
    } catch (e) {
      setState(() => _status = "Error: $e");
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _vehicleIdCtl.dispose();
    _hospitalCtl.dispose();
    _destLatCtl.dispose();
    _destLngCtl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final input = InputDecoration(border: const OutlineInputBorder());
    return Scaffold(
      appBar: AppBar(title: const Text('Smart Ambulance')),
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: ListView(
          children: [
            TextField(controller: _vehicleIdCtl, decoration: input.copyWith(labelText: "Vehicle ID")),
            const SizedBox(height: 8),
            TextField(controller: _hospitalCtl, decoration: input.copyWith(labelText: "Hospital Name")),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: TextField(controller: _destLatCtl, decoration: input.copyWith(labelText: "Dest Lat"))),
                const SizedBox(width: 8),
                Expanded(child: TextField(controller: _destLngCtl, decoration: input.copyWith(labelText: "Dest Lng"))),
              ],
            ),
            const SizedBox(height: 16),
            if (!_missionActive)
              ElevatedButton.icon(
                onPressed: _startMission,
                icon: const Icon(Icons.play_arrow),
                label: const Text("Start Mission"),
              )
            else Row(
              children: [
                Expanded(child: ElevatedButton.icon(
                  onPressed: _completeMission,
                  icon: const Icon(Icons.flag),
                  label: const Text("Complete Mission"),
                )),
              ],
            ),
            const SizedBox(height: 16),
            Text("Status: $_status"),
          ],
        ),
      ),
    );
  }
}