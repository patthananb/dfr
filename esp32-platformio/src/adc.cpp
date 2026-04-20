#include "adc.h"

#include <Arduino.h>
#include <HTTPClient.h>

#include "config.h"
#include "globals.h"
#include "util.h"

// ─── State (file-scoped, shared between ISR and main loop) ──────

// Sample buffer — filled by ISR, drained by uploadAdcData()
static volatile uint16_t adcBuffer[ADC_SAMPLES][8];
static volatile uint16_t adcSampleIndex = 0;
static volatile bool     adcCaptureComplete = false;
static volatile bool     adcCapturing = false;

// Hardware timer handle
static hw_timer_t *adcTimer = NULL;

// ADC pin mapping (order matches JSON keys: v1,v2,v3,i1,i2,i3,A,B)
static const uint8_t adcPins[] = {
  ADC_PIN_V1, ADC_PIN_V2, ADC_PIN_V3,
  ADC_PIN_I1, ADC_PIN_I2, ADC_PIN_I3,
  ADC_PIN_A,  ADC_PIN_B
};

// ─── ISR ─────────────────────────────────────────────────────────

// Runs at ADC_SAMPLE_INTERVAL_US cadence. analogRead is ISR-safe on the
// ESP32 Arduino core. Keep this short — anything slow goes in the loop.
static void IRAM_ATTR onAdcTimer() {
  if (!adcCapturing || adcCaptureComplete) return;

  uint16_t idx = adcSampleIndex;
  if (idx >= ADC_SAMPLES) {
    adcCaptureComplete = true;
    adcCapturing = false;
    return;
  }

  adcBuffer[idx][0] = analogRead(ADC_PIN_V1);
  adcBuffer[idx][1] = analogRead(ADC_PIN_V2);
  adcBuffer[idx][2] = analogRead(ADC_PIN_V3);
  adcBuffer[idx][3] = analogRead(ADC_PIN_I1);
  adcBuffer[idx][4] = analogRead(ADC_PIN_I2);
  adcBuffer[idx][5] = analogRead(ADC_PIN_I3);
  adcBuffer[idx][6] = analogRead(ADC_PIN_A);
  adcBuffer[idx][7] = analogRead(ADC_PIN_B);

  adcSampleIndex = idx + 1;
}

// ─── Public API ─────────────────────────────────────────────────

void setupAdc() {
  analogReadResolution(ADC_RESOLUTION);
  for (uint8_t i = 0; i < 8; i++) {
    analogSetPinAttenuation(adcPins[i], ADC_ATTENUATION);
  }

  // Hardware timer 0, prescaler 80 → 1 µs tick (80 MHz APB / 80)
  adcTimer = timerBegin(0, 80, true);
  timerAttachInterrupt(adcTimer, &onAdcTimer, true);
  timerAlarmWrite(adcTimer, ADC_SAMPLE_INTERVAL_US, true);
  timerAlarmEnable(adcTimer);

  Serial.printf("[adc] Timer interrupt configured — %d µs interval, %d samples\n",
                ADC_SAMPLE_INTERVAL_US, ADC_SAMPLES);
}

void startAdcCapture() {
  adcSampleIndex = 0;
  adcCaptureComplete = false;
  adcCapturing = true;
  Serial.printf("[adc] Capture started (%d samples @ %d µs)\n",
                ADC_SAMPLES, ADC_SAMPLE_INTERVAL_US);
}

bool adcIsCapturing()        { return adcCapturing; }
bool adcCaptureReady()       { return adcCaptureComplete; }
void adcClearCaptureReady()  { adcCaptureComplete = false; }

void uploadAdcData() {
  Serial.println("[adc] Uploading captured data...");

  HTTPClient http;
  http.begin(buildUrl("/api/data"));
  http.addHeader("Content-Type", "application/json");

  // Build JSON body — matches existing fault-data schema
  String body;
  body.reserve(ADC_SAMPLES * 110 + 256);

  body += "{\"espId\":\"";
  body += deviceId;
  body += "\",\"faultType\":\"adc_live\",\"faultLocation\":\"";
  body += deviceId;
  body += "\",\"date\":\"";

  unsigned long sec = millis() / 1000;
  char ts[32];
  snprintf(ts, sizeof(ts), "2025-01-01");
  body += ts;
  body += "\",\"time\":\"";
  snprintf(ts, sizeof(ts), "%02lu:%02lu:%02lu", (sec / 3600) % 24, (sec / 60) % 60, sec % 60);
  body += ts;
  body += "\",\"sampleRateHz\":";
  body += String(1000000UL / ADC_SAMPLE_INTERVAL_US);
  body += ",\"data\":[";

  for (int n = 0; n < ADC_SAMPLES; n++) {
    if (n > 0) body += ',';
    char sample[128];
    snprintf(sample, sizeof(sample),
      "{\"n\":%d,\"v1\":%u,\"v2\":%u,\"v3\":%u,\"i1\":%u,\"i2\":%u,\"i3\":%u,\"A\":%u,\"B\":%u}",
      n,
      adcBuffer[n][0], adcBuffer[n][1], adcBuffer[n][2],
      adcBuffer[n][3], adcBuffer[n][4], adcBuffer[n][5],
      adcBuffer[n][6], adcBuffer[n][7]);
    body += sample;
  }

  body += "]}";

  int code = http.POST(body);
  if (code == 200) {
    Serial.println("[adc] Upload OK");
  } else {
    Serial.printf("[adc] Upload failed  HTTP %d\n", code);
  }
  http.end();
}
