#include "util.h"

#include <WiFi.h>
#include <mbedtls/md.h>

#include "config.h"

String buildUrl(const String &path) {
  return String("http://") + SERVER_HOST + ":" + String(SERVER_PORT) + path;
}

String resolveDeviceId() {
  String cfg = DEVICE_ID;
  if (cfg.length() > 0) return cfg;

  uint8_t mac[6];
  WiFi.macAddress(mac);
  char buf[20];
  snprintf(buf, sizeof(buf), "esp32-%02X%02X%02X%02X",
           mac[2], mac[3], mac[4], mac[5]);
  return String(buf);
}

String toHex(const uint8_t *data, size_t len) {
  String out;
  out.reserve(len * 2);
  for (size_t i = 0; i < len; i++) {
    char hex[3];
    snprintf(hex, sizeof(hex), "%02x", data[i]);
    out += hex;
  }
  return out;
}

String hmacSha256(const String &key, const String &message) {
  uint8_t result[32];
  mbedtls_md_context_t ctx;
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 1);
  mbedtls_md_hmac_starts(&ctx, (const uint8_t *)key.c_str(), key.length());
  mbedtls_md_hmac_update(&ctx, (const uint8_t *)message.c_str(), message.length());
  mbedtls_md_hmac_finish(&ctx, result);
  mbedtls_md_free(&ctx);
  return toHex(result, 32);
}
