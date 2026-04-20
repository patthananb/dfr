#ifndef DFR_ADC_H
#define DFR_ADC_H

// Configure ADC pins, attenuation, resolution, and start the hardware
// timer interrupt that drives sampling at ADC_SAMPLE_INTERVAL_US.
void setupAdc();

// Begin a new capture cycle (resets the buffer index and arms the ISR).
void startAdcCapture();

// True while the ISR is actively filling the buffer.
bool adcIsCapturing();

// True once the buffer is full and ready for upload.
bool adcCaptureReady();

// Clear the "ready" flag after consuming the buffer.
void adcClearCaptureReady();

// POST the captured buffer to /api/data in the standard fault-data schema.
void uploadAdcData();

#endif // DFR_ADC_H
