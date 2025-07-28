#!/bin/bash

# === Configuration ===
API_URL="http://localhost:3000/api/upload"
STATUS_URL="http://localhost:3000/"

# === Fault Metadata ===
FAULT_TYPES=("line_to_ground" "line_to_line" "three_phase")
FAULT_LOCATIONS=("feeder_1" "feeder_2" "feeder_3" "feeder_4" "feeder_5")

# Pick random fault type and location
FAULT_TYPE=${FAULT_TYPES[$RANDOM % ${#FAULT_TYPES[@]}]}
FAULT_LOCATION=${FAULT_LOCATIONS[$RANDOM % ${#FAULT_LOCATIONS[@]}]}

# Get current date and time
CURRENT_DATE=$(date +"%Y-%m-%d")
CURRENT_TIME=$(date +"%H:%M:%S")

# === Check if Next.js server is running ===
if ! curl -s --head "$STATUS_URL" | head -n 1 | grep "200 OK" >/dev/null; then
  echo "Error: Could not connect to the server at $API_URL."
  echo "Please make sure your Next.js server is running ('npm run dev')."
  exit 1
fi

# === Generate Sine Wave CSV Data ===
DURATION=1000 # milliseconds
INTERVAL=10   # 10 ms between points
AMPLITUDE=2000
OFFSET=2047
FREQUENCY=$(awk -v min=1 -v max=10 'BEGIN{srand(); print int(min+rand()*(max-min+1))}')

# CSV with metadata header
CSV_PAYLOAD="# Fault Type: $FAULT_TYPE
# Fault Location: $FAULT_LOCATION
# Date: $CURRENT_DATE
# Time: $CURRENT_TIME
n,value"

# Generate sine wave values
n=1
for ((i = 0; i <= $DURATION; i += $INTERVAL)); do
  VALUE=$(awk -v amp=$AMPLITUDE -v freq=$FREQUENCY -v t_ms=$i -v offset=$OFFSET \
    'BEGIN{print int(amp * sin(2 * 3.14159265359 * freq * (t_ms / 1000)) + offset)}')
  CSV_PAYLOAD+="
$n,$VALUE"
  ((n++))
done

# === Filename includes metadata ===
FILENAME="fault_${FAULT_TYPE}_${FAULT_LOCATION}_${CURRENT_DATE//-/}_${CURRENT_TIME//:/}.csv"

# === Display Info ===
echo "---------------------------------"
echo "Sending sine wave data to the server:"
echo "Fault Type: ${FAULT_TYPE}"
echo "Fault Location: ${FAULT_LOCATION}"
echo "Frequency: ${FREQUENCY} Hz"
echo "Filename: $FILENAME"
echo "---------------------------------"

# === Upload CSV ===
curl -s -X POST \
  -F "file=@-;type=text/csv;filename=$FILENAME" \
  "$API_URL" <<EOF
$CSV_PAYLOAD
EOF

echo -e "\n✅ Successfully sent data to $API_URL"
