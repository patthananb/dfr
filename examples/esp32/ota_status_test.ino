/**
 * ESP32 OTA Status Test
 * 
 * This Arduino sketch demonstrates how to POST OTA update status
 * to the /api/firmware/status endpoint.
 * 
 * Hardware: ESP32 (any variant)
 * Libraries Required:
 * - WiFi (built-in)
 * - HTTPClient (built-in)
 * - ArduinoJson (install via Library Manager)
 * 
 * Instructions:
 * 1. Update WiFi credentials (WIFI_SSID and WIFI_PASSWORD)
 * 2. Update API_ENDPOINT with your server URL
 * 3. Update FEEDER_NUMBER to match your device
 * 4. Upload to ESP32
 * 5. Open Serial Monitor (115200 baud) to see the output
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// API Configuration
const char* API_ENDPOINT = "http://YOUR_SERVER_IP:3000/api/firmware/status";
const char* FEEDER_NUMBER = "feeder_1";  // Change this for each device
const char* FIRMWARE_VERSION = "v1.0.0"; // Your firmware version

// Test interval (in milliseconds)
const unsigned long TEST_INTERVAL = 30000; // 30 seconds
unsigned long lastTestTime = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n=== ESP32 OTA Status Test ===");
  Serial.print("Firmware Version: ");
  Serial.println(FIRMWARE_VERSION);
  Serial.print("Feeder Number: ");
  Serial.println(FEEDER_NUMBER);
  
  // Connect to WiFi
  connectToWiFi();
  
  // Send initial test status
  sendOTAStatus();
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected! Reconnecting...");
    connectToWiFi();
  }
  
  // Send status at regular intervals
  if (millis() - lastTestTime >= TEST_INTERVAL) {
    sendOTAStatus();
    lastTestTime = millis();
  }
  
  delay(1000);
}

void connectToWiFi() {
  Serial.print("\nConnecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection failed!");
  }
}

void sendOTAStatus() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Cannot send status - WiFi not connected");
    return;
  }
  
  Serial.println("\n--- Sending OTA Status ---");
  
  HTTPClient http;
  http.begin(API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  JsonDocument doc;
  
  // Get current datetime in ISO 8601 format
  // Note: ESP32 needs NTP time sync for accurate time
  // For testing, we'll use a formatted string
  char datetime[25];
  sprintf(datetime, "2025-10-01T%02d:%02d:%02dZ", 
          (int)(millis() / 3600000) % 24,
          (int)(millis() / 60000) % 60,
          (int)(millis() / 1000) % 60);
  
  doc["datetime"] = datetime;
  doc["version"] = FIRMWARE_VERSION;
  doc["feeder_number"] = FEEDER_NUMBER;
  
  // Serialize JSON to string
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.print("Payload: ");
  Serial.println(jsonPayload);
  
  // Send POST request
  int httpResponseCode = http.POST(jsonPayload);
  
  // Handle response
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    
    String response = http.getString();
    Serial.print("Response: ");
    Serial.println(response);
    
    // Parse response JSON
    JsonDocument responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);
    
    if (!error) {
      bool success = responseDoc["success"];
      if (success) {
        const char* message = responseDoc["message"];
        const char* filename = responseDoc["filename"];
        Serial.println("✓ Status logged successfully!");
        Serial.print("  Message: ");
        Serial.println(message);
        Serial.print("  Filename: ");
        Serial.println(filename);
      } else {
        const char* errorMsg = responseDoc["error"];
        Serial.println("✗ Error from server:");
        Serial.print("  ");
        Serial.println(errorMsg);
      }
    }
  } else {
    Serial.print("✗ HTTP Error code: ");
    Serial.println(httpResponseCode);
    Serial.println("  Check if server is running and endpoint URL is correct");
  }
  
  http.end();
}
