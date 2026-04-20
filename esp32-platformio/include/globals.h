#ifndef DFR_GLOBALS_H
#define DFR_GLOBALS_H

#include <Arduino.h>

// Device identifier resolved once at boot from the MAC address (or the
// DEVICE_ID override in config.h). Defined in src/main.cpp; consumed by
// the heartbeat, OTA, and ADC upload modules.
extern String deviceId;

#endif // DFR_GLOBALS_H
