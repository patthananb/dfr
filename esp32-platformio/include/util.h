#ifndef DFR_UTIL_H
#define DFR_UTIL_H

#include <Arduino.h>

// Build a full URL for a given path (e.g. "/api/status") using
// SERVER_HOST + SERVER_PORT from config.h.
String buildUrl(const String &path);

// Derive a device ID from the ESP32 MAC if DEVICE_ID is empty,
// otherwise return DEVICE_ID verbatim.
String resolveDeviceId();

// Hex-encode a byte array (lowercase).
String toHex(const uint8_t *data, size_t len);

// Compute HMAC-SHA256 and return the digest as a lowercase hex string.
String hmacSha256(const String &key, const String &message);

#endif // DFR_UTIL_H
