#!/bin/bash

# === Resolve script and data directories ===
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"

# === Fault Metadata ===
FAULT_TYPES=("line_to_ground" "line_to_line" "three_phase")
FAULT_LOCATIONS=("feeder_1" "feeder_2" "feeder_3" "feeder_4" "feeder_5")

# Pick random fault type and location
FAULT_TYPE=${FAULT_TYPES[$RANDOM % ${#FAULT_TYPES[@]}]}
FAULT_LOCATION=${FAULT_LOCATIONS[$RANDOM % ${#FAULT_LOCATIONS[@]}]}

# Get current date and time
CURRENT_DATE=$(date +"%Y-%m-%d")
CURRENT_TIME=$(date +"%H:%M:%S")

# === Ensure data directory exists ===
mkdir -p "$DATA_DIR"

# === Generate Sine Wave JSON Data ===
SAMPLES=1000
AMPLITUDE=2000
OFFSET=2047

# Function to generate random frequency between 40-80 Hz
random_freq() {
  awk -v seed=$RANDOM -v min=40 -v max=80 'BEGIN{srand(seed); print int(min+rand()*(max-min+1))}'
}

V1_FREQ=$(random_freq)
V2_FREQ=$(random_freq)
V3_FREQ=$(random_freq)
I1_FREQ=$(random_freq)
I2_FREQ=$(random_freq)
I3_FREQ=$(random_freq)
A_FREQ=$(random_freq)
B_FREQ=$(random_freq)

# Build JSON payload of sine wave samples
JSON_PAYLOAD="{\"faultType\":\"$FAULT_TYPE\",\"faultLocation\":\"$FAULT_LOCATION\",\"date\":\"$CURRENT_DATE\",\"time\":\"$CURRENT_TIME\",\"data\":["
for ((n = 0; n < SAMPLES; n++)); do
  VALUES=$(awk -v amp=$AMPLITUDE -v offset=$OFFSET -v n=$n \
    -v f1=$V1_FREQ -v f2=$V2_FREQ -v f3=$V3_FREQ -v f4=$I1_FREQ -v f5=$I2_FREQ -v f6=$I3_FREQ -v f7=$A_FREQ -v f8=$B_FREQ \
    'BEGIN{t=n/1000; pi=3.14159265359; \
      printf "%d %d %d %d %d %d %d %d", \
      int(amp*sin(2*pi*f1*t)+offset), int(amp*sin(2*pi*f2*t)+offset), int(amp*sin(2*pi*f3*t)+offset), \
      int(amp*sin(2*pi*f4*t)+offset), int(amp*sin(2*pi*f5*t)+offset), int(amp*sin(2*pi*f6*t)+offset), \
      int(amp*sin(2*pi*f7*t)+offset), int(amp*sin(2*pi*f8*t)+offset)}')
  read v1 v2 v3 i1 i2 i3 A B <<<"$VALUES"
  JSON_PAYLOAD+="{\"n\":$n,\"v1\":$v1,\"v2\":$v2,\"v3\":$v3,\"i1\":$i1,\"i2\":$i2,\"i3\":$i3,\"A\":$A,\"B\":$B},"
done
JSON_PAYLOAD="${JSON_PAYLOAD%,}]}"

# === Filename includes metadata ===
FILENAME="fault_${FAULT_TYPE}_${FAULT_LOCATION}_${CURRENT_DATE//-/}_${CURRENT_TIME//:/}.json"

# === Display Info ===
echo "---------------------------------"
echo "Generating sine wave data:"
echo "Fault Type: ${FAULT_TYPE}"
echo "Fault Location: ${FAULT_LOCATION}"
echo "Frequencies (Hz): v1=$V1_FREQ v2=$V2_FREQ v3=$V3_FREQ i1=$I1_FREQ i2=$I2_FREQ i3=$I3_FREQ A=$A_FREQ B=$B_FREQ"
echo "Filename: $FILENAME"
echo "---------------------------------"

# === Save JSON locally ===
echo "$JSON_PAYLOAD" > "$DATA_DIR/$FILENAME"
if [[ -f "$DATA_DIR/$FILENAME" ]]; then
  echo "✅ Saved data to $DATA_DIR/$FILENAME"
else
  echo "⚠️ Failed to save data to $DATA_DIR/$FILENAME"
fi

