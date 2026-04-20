#include "net.h"

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "config.h"
#include "globals.h"
#include "util.h"

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[wifi] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > WIFI_CONNECT_TIMEOUT_MS) {
      Serial.println("\n[wifi] Connection timeout — will retry next loop");
      return;
    }
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[wifi] Connected  IP: %s  RSSI: %d dBm\n",
                WiFi.localIP().toString().c_str(), WiFi.RSSI());
}

void sendHeartbeat() {
  HTTPClient http;
  http.begin(buildUrl("/api/status"));
  http.addHeader("Content-Type", "application/json");

  JsonDocument doc;
  doc["espId"]           = deviceId;
  doc["firmwareVersion"] = FW_VERSION;
  doc["rssi"]            = WiFi.RSSI();
  doc["uptime"]          = (unsigned long)(millis() / 1000);
  doc["freeHeap"]        = (unsigned long)ESP.getFreeHeap();

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  if (code == 200) {
    Serial.println("[heartbeat] OK");
  } else {
    Serial.printf("[heartbeat] Failed  HTTP %d\n", code);
  }
  http.end();
}
