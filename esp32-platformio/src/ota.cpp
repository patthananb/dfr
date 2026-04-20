#include "ota.h"

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Update.h>
#include <ArduinoJson.h>
#include <mbedtls/md.h>

#include "config.h"
#include "globals.h"
#include "util.h"

// Verify HMAC signature matches server-provided value.
// Payload format must match src/lib/crypto.js: "version:sha256:filename"
static bool verifySignature(const String &version, const String &sha256,
                            const String &filename, const String &signature) {
  if (signature.length() == 0) {
    Serial.println("[ota] No signature provided — skipping HMAC check");
    return true;
  }
  String payload = version + ":" + sha256 + ":" + filename;
  String computed = hmacSha256(HMAC_SECRET, payload);
  if (computed.equalsIgnoreCase(signature)) {
    Serial.println("[ota] HMAC signature verified");
    return true;
  }
  Serial.println("[ota] HMAC signature MISMATCH — aborting update");
  return false;
}

// Stream firmware from server, compute SHA-256 on the fly, then flash.
static bool performOta(const String &url, const String &expectedSha256,
                       size_t expectedSize) {
  HTTPClient http;
  http.begin(buildUrl(url));
  int code = http.GET();
  if (code != 200) {
    Serial.printf("[ota] Download failed  HTTP %d\n", code);
    http.end();
    return false;
  }

  int contentLength = http.getSize();
  if (contentLength <= 0 && expectedSize > 0) {
    contentLength = (int)expectedSize;
  }

  WiFiClient *stream = http.getStreamPtr();
  if (!stream) {
    Serial.println("[ota] No stream");
    http.end();
    return false;
  }

  if (!Update.begin(contentLength > 0 ? (size_t)contentLength : UPDATE_SIZE_UNKNOWN)) {
    Serial.printf("[ota] Update.begin failed: %s\n", Update.errorString());
    http.end();
    return false;
  }

  // SHA-256 context for on-the-fly verification
  mbedtls_md_context_t sha;
  mbedtls_md_init(&sha);
  mbedtls_md_setup(&sha, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 0);
  mbedtls_md_starts(&sha);

  uint8_t buf[1024];
  size_t totalRead = 0;

  while (http.connected() && (contentLength <= 0 || (int)totalRead < contentLength)) {
    size_t available = stream->available();
    if (available == 0) {
      delay(1);
      continue;
    }
    size_t toRead = (available < sizeof(buf)) ? available : sizeof(buf);
    size_t bytesRead = stream->readBytes(buf, toRead);
    if (bytesRead == 0) break;

    Update.write(buf, bytesRead);
    mbedtls_md_update(&sha, buf, bytesRead);
    totalRead += bytesRead;

    if ((totalRead % (64 * 1024)) < bytesRead) {
      Serial.printf("[ota] %u bytes\n", (unsigned)totalRead);
    }
  }
  http.end();

  uint8_t hash[32];
  mbedtls_md_finish(&sha, hash);
  mbedtls_md_free(&sha);
  String actualSha = toHex(hash, 32);

  if (expectedSha256.length() > 0 && !actualSha.equalsIgnoreCase(expectedSha256)) {
    Serial.println("[ota] SHA-256 MISMATCH — aborting");
    Serial.printf("  expected: %s\n  actual:   %s\n",
                  expectedSha256.c_str(), actualSha.c_str());
    Update.abort();
    return false;
  }
  if (expectedSha256.length() > 0) {
    Serial.println("[ota] SHA-256 verified");
  }

  if (!Update.end(true)) {
    Serial.printf("[ota] Update.end failed: %s\n", Update.errorString());
    return false;
  }

  Serial.printf("[ota] Success — %u bytes written\n", (unsigned)totalRead);
  return true;
}

void checkForUpdate() {
  String url = "/api/firmware/check?espId=" + deviceId +
               "&currentVersion=" + String(FW_VERSION);
  HTTPClient http;
  http.begin(buildUrl(url));
  int code = http.GET();

  if (code != 200) {
    Serial.printf("[ota] Check failed  HTTP %d\n", code);
    http.end();
    return;
  }

  String payload = http.getString();
  http.end();

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    Serial.printf("[ota] JSON parse error: %s\n", err.c_str());
    return;
  }

  bool updateAvailable = doc["update"] | false;
  if (!updateAvailable) {
    Serial.println("[ota] Up to date");
    return;
  }

  const char *newVersion   = doc["version"]      | "";
  const char *filename     = doc["filename"]     | "";
  const char *sha256       = doc["sha256"]       | "";
  const char *signature    = doc["signature"]    | "";
  const char *dlUrl        = doc["url"]          | "";
  bool forceUpdate         = doc["forceUpdate"]  | false;
  const char *releaseNotes = doc["releaseNotes"] | "";

  Serial.printf("[ota] Update available: %s -> %s\n", FW_VERSION, newVersion);
  if (strlen(releaseNotes) > 0) {
    Serial.printf("[ota] Release notes: %s\n", releaseNotes);
  }

#if !AUTO_UPDATE
  if (!forceUpdate) {
    Serial.println("[ota] AUTO_UPDATE disabled and not forced — skipping");
    return;
  }
  Serial.println("[ota] Force update — proceeding despite AUTO_UPDATE=0");
#endif

  if (!verifySignature(newVersion, sha256, filename, signature)) {
    return;
  }

  Serial.println("[ota] Downloading firmware...");
  if (performOta(dlUrl, sha256, 0)) {
    Serial.println("[ota] Rebooting into new firmware...");
    delay(1000);
    ESP.restart();
  }
}
