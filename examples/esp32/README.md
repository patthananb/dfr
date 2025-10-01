# ESP32 OTA Status Test

This directory contains an Arduino sketch for ESP32 to test the `/api/firmware/status` endpoint.

## Overview

The `ota_status_test.ino` sketch demonstrates how ESP32 devices can POST their OTA update status to the server for centralized logging and tracking.

## Hardware Requirements

- ESP32 (any variant: ESP32, ESP32-S2, ESP32-S3, ESP32-C3, etc.)
- USB cable for programming

## Software Requirements

### Arduino IDE Setup

1. **Install Arduino IDE** (version 1.8.x or 2.x)
   - Download from: https://www.arduino.cc/en/software

2. **Install ESP32 Board Support**
   - Open Arduino IDE
   - Go to `File` → `Preferences`
   - Add this URL to "Additional Board Manager URLs":
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Go to `Tools` → `Board` → `Boards Manager`
   - Search for "esp32" and install "esp32 by Espressif Systems"

3. **Install Required Libraries**
   - Go to `Sketch` → `Include Library` → `Manage Libraries`
   - Search and install: **ArduinoJson** by Benoit Blanchon (version 7.x)
   - WiFi and HTTPClient are built-in with ESP32 board support

## Configuration

Before uploading the sketch, update these configuration values in `ota_status_test.ino`:

```cpp
// WiFi Configuration
const char* WIFI_SSID = "YOUR_WIFI_SSID";        // Your WiFi network name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // Your WiFi password

// API Configuration
const char* API_ENDPOINT = "http://YOUR_SERVER_IP:3000/api/firmware/status";
const char* FEEDER_NUMBER = "feeder_1";  // Unique identifier for this device
const char* FIRMWARE_VERSION = "v1.0.0"; // Your firmware version
```

### Finding Your Server IP

If running the server locally:
- **Same computer**: Use `localhost` or `127.0.0.1`
- **Different computer on same network**: 
  - Windows: Run `ipconfig` in Command Prompt
  - Mac/Linux: Run `ifconfig` or `ip addr` in Terminal
  - Look for your local IP (e.g., `192.168.1.100`)

Example endpoint: `http://192.168.1.100:3000/api/firmware/status`

## Usage

1. **Open the Sketch**
   - Launch Arduino IDE
   - Open `ota_status_test.ino`

2. **Configure Settings**
   - Update WiFi credentials
   - Set your server IP address
   - Customize feeder number and firmware version

3. **Select Board**
   - Go to `Tools` → `Board`
   - Select your ESP32 variant (e.g., "ESP32 Dev Module")

4. **Select Port**
   - Connect ESP32 to computer via USB
   - Go to `Tools` → `Port`
   - Select the COM port (Windows) or `/dev/ttyUSB*` (Linux) or `/dev/cu.usbserial-*` (Mac)

5. **Upload**
   - Click the "Upload" button (→) or press `Ctrl+U` / `Cmd+U`
   - Wait for compilation and upload to complete

6. **Monitor Output**
   - Open Serial Monitor: `Tools` → `Serial Monitor`
   - Set baud rate to **115200**
   - You should see WiFi connection status and POST request results

## Expected Serial Output

```
=== ESP32 OTA Status Test ===
Firmware Version: v1.0.0
Feeder Number: feeder_1

Connecting to WiFi: YourWiFiName
...........
WiFi connected!
IP address: 192.168.1.150

--- Sending OTA Status ---
Payload: {"datetime":"2025-10-01T00:05:23Z","version":"v1.0.0","feeder_number":"feeder_1"}
HTTP Response code: 200
Response: {"success":true,"message":"OTA status logged successfully","filename":"ota-status_feeder_1_2025-10-01T23-40-45-484Z.json"}
✓ Status logged successfully!
  Message: OTA status logged successfully
  Filename: ota-status_feeder_1_2025-10-01T23-40-45-484Z.json
```

## API Request Details

The sketch sends a POST request with the following JSON payload:

```json
{
  "datetime": "2025-10-01T00:05:23Z",
  "version": "v1.0.0",
  "feeder_number": "feeder_1"
}
```

### Success Response (HTTP 200)
```json
{
  "success": true,
  "message": "OTA status logged successfully",
  "filename": "ota-status_feeder_1_2025-10-01T23-40-45-484Z.json"
}
```

### Error Response (HTTP 400)
```json
{
  "success": false,
  "error": "Missing required fields: datetime, version, and feeder_number are required"
}
```

## Troubleshooting

### WiFi Connection Issues
- **Problem**: "WiFi connection failed!"
- **Solutions**:
  - Verify SSID and password are correct
  - Check if ESP32 is within range of WiFi router
  - Ensure WiFi network is 2.4GHz (most ESP32s don't support 5GHz)

### HTTP Error Codes
- **HTTP Error -1**: Connection failed
  - Check if server is running (`npm run dev`)
  - Verify server IP address is correct
  - Ensure ESP32 and server are on the same network
  
- **HTTP 400**: Bad request
  - Check that all required fields are being sent
  - Verify JSON payload format

- **HTTP 404**: Endpoint not found
  - Verify the API_ENDPOINT URL is correct
  - Ensure the server is running with the status endpoint

### Compilation Errors
- **ArduinoJson.h not found**:
  - Install ArduinoJson library via Library Manager
  - Use version 7.x (latest)

- **WiFi.h not found**:
  - Ensure ESP32 board support is installed
  - Select correct ESP32 board in Tools menu

## Customization

### Change Update Interval
Modify the `TEST_INTERVAL` constant (in milliseconds):
```cpp
const unsigned long TEST_INTERVAL = 60000; // 60 seconds
```

### Add NTP Time Sync
For production use with accurate timestamps, add NTP time synchronization:

```cpp
#include <time.h>

void setupTime() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.println("Waiting for NTP time sync...");
  time_t now = time(nullptr);
  while (now < 8 * 3600 * 2) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
  }
  Serial.println("\nTime synchronized!");
}

String getISO8601Time() {
  time_t now = time(nullptr);
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}
```

Then in `setup()`, call `setupTime()` after WiFi connection, and in `sendOTAStatus()`, replace the datetime line with:
```cpp
doc["datetime"] = getISO8601Time();
```

## Testing Multiple Devices

To simulate multiple feeders, flash different ESP32 devices with different `FEEDER_NUMBER` values:
- Device 1: `feeder_1`
- Device 2: `feeder_2`
- Device 3: `feeder_3`
- etc.

Each device will log to its own status files on the server.

## Support

For issues or questions:
- Check the main repository README for server setup
- Review the API endpoint documentation
- Verify network connectivity between ESP32 and server
