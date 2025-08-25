'use client';

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const GraphPage = () => {
  const [chartData, setChartData] = useState(null);
  const [filenames, setFilenames] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');

  useEffect(() => {
    const fetchFilenames = async () => {
      try {
        const res = await fetch('/api/data');
        const data = await res.json();
        if (data.success) {
          setFilenames(data.filenames);
          if (data.filenames.length > 0) {
            setSelectedFile(data.filenames[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching filenames:', error);
      }
    };
    fetchFilenames();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedFile) return;

      try {
        const res = await fetch(`/api/data?file=${selectedFile}`);
        const data = await res.json();

        if (data.success) {
          const allData = [];

          data.files.forEach(fileContent => {
            let parsed = false;

            // Attempt JSON parsing first
            try {
              const json = JSON.parse(fileContent);
              if (Array.isArray(json.data)) {
                json.data.forEach(point => {
                  const { n, V1, V2, V3, I1, I2, I3 } = point;
                  if ([n, V1, V2, V3, I1, I2, I3].every(v => v !== undefined)) {
                    allData.push({
                      n: Number(n),
                      V1: Number(V1),
                      V2: Number(V2),
                      V3: Number(V3),
                      I1: Number(I1),
                      I2: Number(I2),
                      I3: Number(I3),
                    });
                  }
                });
                parsed = true;
              }
            } catch {
              // Ignore JSON parse errors and attempt CSV parsing
            }

            if (!parsed) {
              const lines = fileContent.trim().split(/\r?\n/);
              lines.forEach(line => {
                if (!line || line.startsWith('#')) return;
                const parts = line.split(',');
                if (parts[0] === 'n') return;
                if (parts.length >= 7) {
                  const [n, V1, V2, V3, I1, I2, I3] = parts.map(Number);
                  if (![n, V1, V2, V3, I1, I2, I3].some(Number.isNaN)) {
                    allData.push({ n, V1, V2, V3, I1, I2, I3 });
                  }
                }
              });
            }
          });

          allData.sort((a, b) => a.n - b.n);

          const labels = allData.map(d => d.n);
          const chartJsData = {
            labels,
            datasets: [
              { label: 'V1', data: allData.map(d => d.V1), borderColor: 'red', tension: 0.1 },
              { label: 'V2', data: allData.map(d => d.V2), borderColor: 'green', tension: 0.1 },
              { label: 'V3', data: allData.map(d => d.V3), borderColor: 'blue', tension: 0.1 },
              { label: 'I1', data: allData.map(d => d.I1), borderColor: 'orange', tension: 0.1 },
              { label: 'I2', data: allData.map(d => d.I2), borderColor: 'purple', tension: 0.1 },
              { label: 'I3', data: allData.map(d => d.I3), borderColor: 'brown', tension: 0.1 },
            ],
          };
          setChartData(chartJsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [selectedFile]);

  return (
    <div className="container">
      <h1 className="title">Sensor Data</h1>
      <div className="dropdown-container">
        <select onChange={(e) => setSelectedFile(e.target.value)} value={selectedFile}>
          {filenames.map(file => (
            <option key={file} value={file}>{file}</option>
          ))}
        </select>
      </div>
      {chartData ? (
        <div className="chart-container">
          <Line data={chartData} />
        </div>
      ) : (
        <p>Loading data...</p>
      )}
    </div>
  );
};

export default GraphPage;
