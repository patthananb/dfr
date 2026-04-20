#ifndef DFR_OTA_H
#define DFR_OTA_H

// Check the server for a firmware update. If one is available and passes
// HMAC + SHA-256 verification, flash it and reboot. Honours AUTO_UPDATE
// and the server-side forceUpdate flag.
void checkForUpdate();

#endif // DFR_OTA_H
