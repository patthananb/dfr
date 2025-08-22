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
          let allData = [];
          data.files.forEach(fileContent => {
            try {
              const json = JSON.parse(fileContent);
              if (Array.isArray(json.data)) {
                json.data.forEach(point => {
                  if (point.timestamp !== undefined && point.value !== undefined) {
                    allData.push({
                      timestamp: new Date(point.timestamp),
                      value: parseFloat(point.value),
                    });
                  }
                });
              }
            } catch (err) {
              console.error('Invalid JSON in data file:', err);
            }
          });

          allData.sort((a, b) => a.timestamp - b.timestamp);

          const chartJsData = {
            labels: allData.map(d => d.timestamp.toLocaleTimeString()),
            datasets: [
              {
                label: 'Sensor Value',
                data: allData.map(d => d.value),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
              },
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
