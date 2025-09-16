const String API_BASE_URL = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:8080', // Android emulator -> host
);
// For iOS simulator use http://localhost:8080