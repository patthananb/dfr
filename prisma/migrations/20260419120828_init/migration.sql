-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "ssid" TEXT,
    "passwordEnc" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Device" (
    "espId" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Device_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Heartbeat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "espId" TEXT NOT NULL,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "rssi" INTEGER,
    "firmwareVersion" TEXT,
    CONSTRAINT "Heartbeat_espId_fkey" FOREIGN KEY ("espId") REFERENCES "Device" ("espId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Fault" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "faultType" TEXT NOT NULL,
    "faultLocation" TEXT NOT NULL,
    "espId" TEXT,
    "recordedAt" DATETIME NOT NULL,
    "sampleRateHz" INTEGER,
    "sampleCount" INTEGER,
    "sourceFilename" TEXT,
    "payload" TEXT NOT NULL,
    CONSTRAINT "Fault_espId_fkey" FOREIGN KEY ("espId") REFERENCES "Device" ("espId") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FirmwareVersion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "espId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "hmacSignature" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "binaryPath" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FirmwareVersion_espId_fkey" FOREIGN KEY ("espId") REFERENCES "Device" ("espId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ForceUpdate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "espId" TEXT,
    "siteId" TEXT,
    "versionTarget" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "ForceUpdate_espId_fkey" FOREIGN KEY ("espId") REFERENCES "Device" ("espId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ForceUpdate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Device_siteId_idx" ON "Device"("siteId");

-- CreateIndex
CREATE INDEX "Heartbeat_espId_ts_idx" ON "Heartbeat"("espId", "ts");

-- CreateIndex
CREATE INDEX "Fault_recordedAt_idx" ON "Fault"("recordedAt");

-- CreateIndex
CREATE INDEX "Fault_espId_recordedAt_idx" ON "Fault"("espId", "recordedAt");

-- CreateIndex
CREATE INDEX "Fault_faultType_recordedAt_idx" ON "Fault"("faultType", "recordedAt");

-- CreateIndex
CREATE INDEX "FirmwareVersion_espId_isActive_idx" ON "FirmwareVersion"("espId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FirmwareVersion_espId_version_key" ON "FirmwareVersion"("espId", "version");

-- CreateIndex
CREATE INDEX "ForceUpdate_espId_idx" ON "ForceUpdate"("espId");

-- CreateIndex
CREATE INDEX "ForceUpdate_siteId_idx" ON "ForceUpdate"("siteId");
