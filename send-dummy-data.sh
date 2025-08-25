#!/bin/bash

API_URL="http://localhost:3000/api/upload"
STATUS_URL="http://localhost:3000/"

FAULT_TYPES=("line_to_ground" "line_to_line" "three_phase")
FAULT_LOCATIONS=("feeder_1" "feeder_2" "feeder_3" "feeder_4" "feeder_5")

SAMPLES=100
V_OFFSET=2048
FREQUENCY=""
FAULT_TYPE=""
FAULT_LOCATION=""

while getopts "u:t:l:s:f:" opt; do
  case $opt in
    u)
      API_URL="$OPTARG"
      STATUS_URL="${API_URL%/api/upload}/"
      ;;
    t)
      FAULT_TYPE="$OPTARG"
      ;;
    l)
      FAULT_LOCATION="$OPTARG"
      ;;
    s)
      SAMPLES="$OPTARG"
      ;;
    f)
      FREQUENCY="$OPTARG"
      ;;
    *)
      echo "Usage: $0 [-u api_url] [-t fault_type] [-l fault_location] [-s samples] [-f frequency]"
      exit 1
      ;;
  esac
done

if [ -z "$FAULT_TYPE" ]; then
  FAULT_TYPE=${FAULT_TYPES[$RANDOM % ${#FAULT_TYPES[@]}]}
fi
if [ -z "$FAULT_LOCATION" ]; then
  FAULT_LOCATION=${FAULT_LOCATIONS[$RANDOM % ${#FAULT_LOCATIONS[@]}]}
fi
if [ -z "$FREQUENCY" ]; then
  FREQUENCY=$(awk -v min=40 -v max=60 'BEGIN{srand(); print int(min+rand()*(max-min+1))}')
fi

# Random amplitudes for each channel
V1_AMP=$(awk 'BEGIN{srand(); print int(1000+rand()*3000)}')
V2_AMP=$(awk 'BEGIN{srand(); print int(1000+rand()*3000)}')
V3_AMP=$(awk 'BEGIN{srand(); print int(1000+rand()*3000)}')
I1_AMP=$(awk 'BEGIN{srand(); print int(100+rand()*900)}')
I2_AMP=$(awk 'BEGIN{srand(); print int(100+rand()*900)}')
I3_AMP=$(awk 'BEGIN{srand(); print int(100+rand()*900)}')

CURRENT_DATE=$(date +"%Y-%m-%d")
CURRENT_TIME=$(date +"%H:%M:%S")

if ! curl -s --head "$STATUS_URL" | head -n 1 | grep "200 OK" >/dev/null; then
  echo "Error: Could not connect to the server at $API_URL."
  echo "Please make sure your Next.js server is running ('npm run dev')."
  exit 1
fi

read -r -d '' JSON_PAYLOAD <<JSON_START
{"faultType":"$FAULT_TYPE","faultLocation":"$FAULT_LOCATION","date":"$CURRENT_DATE","time":"$CURRENT_TIME","data":[
JSON_START
for ((i = 1; i <= SAMPLES; i++)); do
  ROW=$(awk -v i=$i -v freq=$FREQUENCY -v v1a=$V1_AMP -v v2a=$V2_AMP -v v3a=$V3_AMP -v voff=$V_OFFSET -v i1a=$I1_AMP -v i2a=$I2_AMP -v i3a=$I3_AMP -v samples=$SAMPLES 'BEGIN{
    ang = 2 * 3.14159265359 * freq * i / samples;
    V1 = int(v1a * sin(ang) + voff);
    V2 = int(v2a * sin(ang - 2 * 3.14159265359 / 3) + voff);
    V3 = int(v3a * sin(ang + 2 * 3.14159265359 / 3) + voff);
    I1 = int(i1a * sin(ang));
    I2 = int(i2a * sin(ang - 2 * 3.14159265359 / 3));
    I3 = int(i3a * sin(ang + 2 * 3.14159265359 / 3));
    printf("{\\\"n\\\":%d,\\\"V1\\\":%d,\\\"V2\\\":%d,\\\"V3\\\":%d,\\\"I1\\\":%d,\\\"I2\\\":%d,\\\"I3\\\":%d}", i, V1, V2, V3, I1, I2, I3);
  }')
  JSON_PAYLOAD+="$ROW"
  if [ $i -lt $SAMPLES ]; then
    JSON_PAYLOAD+=","
  fi

done

JSON_PAYLOAD+="]}"

# === Filename includes metadata ===
FILENAME="fault_${FAULT_TYPE}_${FAULT_LOCATION}_${CURRENT_DATE//-/}_${CURRENT_TIME//:/}.json"

# === Display Info ===
echo "---------------------------------"
echo "Sending sine wave data to the server:"
echo "Fault Type: ${FAULT_TYPE}"
echo "Fault Location: ${FAULT_LOCATION}"
echo "Frequency: ${FREQUENCY} Hz"
echo "Filename: $FILENAME"
echo "---------------------------------"

# === Upload JSON ===
curl -s -X POST \
  -F "file=@-;type=application/json;filename=$FILENAME" \
  "$API_URL" <<JSON
$JSON_PAYLOAD
JSON

echo -e "\n✅ Successfully sent data to $API_URL"
