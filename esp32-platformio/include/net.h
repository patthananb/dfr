#ifndef DFR_NET_H
#define DFR_NET_H

// Establish or maintain a WiFi connection. Safe to call every loop tick:
// returns immediately if already connected.
void connectWiFi();

// POST a heartbeat to /api/status with deviceId, firmware version,
// RSSI, uptime, and free heap.
void sendHeartbeat();

#endif // DFR_NET_H
