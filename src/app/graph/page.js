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
  const [voltageChart, setVoltageChart] = useState(null);
  const [currentChart, setCurrentChart] = useState(null);
  const [filenames, setFilenames] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [dataPoints, setDataPoints] = useState([]);
  const [visible, setVisible] = useState({
    V1: true,
    V2: true,
    V3: true,
    I1: true,
    I2: true,
    I3: true,
  });

  useEffect(() => {
    const fetchFilenames = async () => {
      try {
        const res = await fetch('/api/data');
        const data = await res.json();
        if (data.success) {
          const jsonFiles = (data.filenames || []).filter(name => name.endsWith('.json'));
          setFilenames(jsonFiles);
          if (jsonFiles.length > 0) {
            setSelectedFile(jsonFiles[0]);
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
          setDataPoints(allData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [selectedFile]);

  useEffect(() => {
    if (dataPoints.length === 0) {
      setVoltageChart(null);
      setCurrentChart(null);
      return;
    }

    const labels = dataPoints.map(d => d.n);

    setVoltageChart({
      labels,
      datasets: [
        { label: 'V1', data: dataPoints.map(d => d.V1), borderColor: 'red', tension: 0.1, hidden: !visible.V1 },
        { label: 'V2', data: dataPoints.map(d => d.V2), borderColor: 'green', tension: 0.1, hidden: !visible.V2 },
        { label: 'V3', data: dataPoints.map(d => d.V3), borderColor: 'blue', tension: 0.1, hidden: !visible.V3 },
      ],
    });

    setCurrentChart({
      labels,
      datasets: [
        { label: 'I1', data: dataPoints.map(d => d.I1), borderColor: 'orange', tension: 0.1, hidden: !visible.I1 },
        { label: 'I2', data: dataPoints.map(d => d.I2), borderColor: 'purple', tension: 0.1, hidden: !visible.I2 },
        { label: 'I3', data: dataPoints.map(d => d.I3), borderColor: 'brown', tension: 0.1, hidden: !visible.I3 },
      ],
    });
  }, [dataPoints, visible]);

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
      <div className="controls">
        {Object.keys(visible).map(key => (
          <label key={key} className="mr-2">
            <input
              type="checkbox"
              checked={visible[key]}
              onChange={() =>
                setVisible(v => ({ ...v, [key]: !v[key] }))
              }
            />
            <span className="ml-1">{key}</span>
          </label>
        ))}
      </div>
      {voltageChart && currentChart ? (
        <>
          <div className="chart-container">
            <h2 className="text-xl font-semibold mb-2">Voltage</h2>
            <Line data={voltageChart} />
          </div>
          <div className="chart-container mt-8">
            <h2 className="text-xl font-semibold mb-2">Current</h2>
            <Line data={currentChart} />
          </div>
        </>
      ) : (
        <p>Loading data...</p>
      )}
    </div>
  );
};

export default GraphPage;
