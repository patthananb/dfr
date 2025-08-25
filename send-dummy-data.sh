#!/bin/bash

API_URL="http://localhost:3000/api/upload"
STATUS_URL="http://localhost:3000/"

FAULT_TYPES=("line_to_ground" "line_to_line" "three_phase")
FAULT_LOCATIONS=("feeder_1" "feeder_2" "feeder_3" "feeder_4" "feeder_5")

SAMPLES=100
V_AMP=3000
V_OFFSET=2048
I_AMP=1000
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
  FREQUENCY=$(awk -v min=1 -v max=10 'BEGIN{srand(); print int(min+rand()*(max-min+1))}')
fi

CURRENT_DATE=$(date +"%Y-%m-%d")
CURRENT_TIME=$(date +"%H:%M:%S")

if ! curl -s --head "$STATUS_URL" | head -n 1 | grep "200 OK" >/dev/null; then
  echo "Error: Could not connect to the server at $API_URL."
  echo "Please make sure your Next.js server is running ('npm run dev')."
  exit 1
fi

JSON_PAYLOAD="{\"faultType\":\"$FAULT_TYPE\",\"faultLocation\":\"$FAULT_LOCATION\",\"date\":\"$CURRENT_DATE\",\"time\":\"$CURRENT_TIME\",\"data\":[

for ((i = 1; i <= SAMPLES; i++)); do
  ROW=$(awk -v i=$i -v freq=$FREQUENCY -v vamp=$V_AMP -v voff=$V_OFFSET -v iamp=$I_AMP -v samples=$SAMPLES 'BEGIN{
    ang = 2 * 3.14159265359 * freq * i / samples;
    V1 = int(vamp * sin(ang) + voff);
    V2 = int(vamp * sin(ang - 2 * 3.14159265359 / 3) + voff);
    V3 = int(vamp * sin(ang + 2 * 3.14159265359 / 3) + voff);
    I1 = int(iamp * sin(ang));
    I2 = int(iamp * sin(ang - 2 * 3.14159265359 / 3));
    I3 = int(iamp * sin(ang + 2 * 3.14159265359 / 3));
    printf("{\\\"n\\\":%d,\\\"V1\\\":%d,\\\"V2\\\":%d,\\\"V3\\\":%d,\\\"I1\\\":%d,\\\"I2\\\":%d,\\\"I3\\\":%d}", i, V1, V2, V3, I1, I2, I3);
  }')
  JSON_PAYLOAD+="$ROW"
  if [ $i -lt $SAMPLES ]; then
    JSON_PAYLOAD+=",";
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
