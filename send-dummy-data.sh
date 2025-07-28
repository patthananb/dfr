#!/bin/bash

# The URL of your Next.js API endpoint
API_URL="http://localhost:3000/api/upload"
# The URL of the home page to check for server status
STATUS_URL="http://localhost:3000/"

# Check if the server is reachable
if ! curl -s --head "$STATUS_URL" | head -n 1 | grep "200 OK" > /dev/null; then
    echo "Error: Could not connect to the server at $API_URL."
    echo "Please make sure your Next.js development server is running ('npm run dev')."
    exit 1
fi

# --- Generate Sine Wave Data ---
# Duration of the sine wave in milliseconds
DURATION=1000 # 1 second
# Interval between data points in milliseconds
INTERVAL=10 # 10ms interval, 100 points for 1 second
# Amplitude of the sine wave (0-4095 for ADC range)
AMPLITUDE=2000
# Offset to center the sine wave within the ADC range
OFFSET=2047
# Random frequency between 1 Hz and 10 Hz
FREQUENCY=$(awk -v min=1 -v max=10 'BEGIN{srand(); print int(min+rand()*(max-min+1))}')

CSV_PAYLOAD="timestamp,value"
START_TIMESTAMP=$(date +%s%3N)

for (( i=0; i<=$DURATION; i+=$INTERVAL )); do
    CURRENT_TIMESTAMP=$((START_TIMESTAMP + i))
    # Calculate sine wave value: AMPLITUDE * sin(2 * PI * FREQUENCY * time_in_seconds) + OFFSET
    # time_in_seconds = i / 1000 (since i is in milliseconds)
    VALUE=$(awk -v amp=$AMPLITUDE -v freq=$FREQUENCY -v t_ms=$i -v offset=$OFFSET 'BEGIN{print int(amp * sin(2 * 3.14159265359 * freq * (t_ms / 1000)) + offset)}')
    CSV_PAYLOAD+="
$CURRENT_TIMESTAMP,$VALUE"
done

# Unique filename for the upload
FILENAME="dummy-data-$START_TIMESTAMP.csv"
# --- End of Data Generation ---

echo "---------------------------------"
echo "Sending sine wave data to the server:"
echo "Frequency: ${FREQUENCY} Hz"
echo "Duration: ${DURATION} ms"
echo "Interval: ${INTERVAL} ms"
echo "Filename: $FILENAME"
echo "---------------------------------"

# Use curl to send the data as a multipart/form-data request.
# The `-F "file=@-;..."` part tells curl to read the content from stdin,
# which is provided by the here-document (`<<EOF`).
curl -s -X POST \
  -F "file=@-;type=text/csv;filename=$FILENAME" \
  "$API_URL" <<EOF
$CSV_PAYLOAD
EOF

echo -e "\n\nSuccessfully sent data. Visit http://localhost:3000/graph to see the updated chart."
