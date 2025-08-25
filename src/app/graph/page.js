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
  const [voltageData, setVoltageData] = useState(null);
  const [currentData, setCurrentData] = useState(null);
  const [filenames, setFilenames] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [visible, setVisible] = useState({
    v1: true,
    v2: true,
    v3: true,
    i1: true,
    i2: true,
    i3: true,
  });
  const [scale, setScale] = useState(1000);

  useEffect(() => {
    const fetchFilenames = async () => {
      try {
        const res = await fetch('/api/data');
        const data = await res.json();
        if (data.success) {
          const files = data.filenames.filter(name => name !== '.gitkeep');
          setFilenames(files);
          if (files.length > 0) {
            setSelectedFile(files[0]);
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
        const result = await res.json();
        if (!result.success || !result.files?.[0]) return;
        const fileContent = result.files[0];
        const json = JSON.parse(fileContent);
        if (!Array.isArray(json.data)) return;

        const samples = json.data;
        const labels = samples.map(p => p.n);

        const voltageDatasets = [
          { key: 'v1', label: 'V1', data: samples.map(p => p.v1), borderColor: 'red' },
          { key: 'v2', label: 'V2', data: samples.map(p => p.v2), borderColor: 'green' },
          { key: 'v3', label: 'V3', data: samples.map(p => p.v3), borderColor: 'blue' },
        ];
        const currentDatasets = [
          { key: 'i1', label: 'I1', data: samples.map(p => p.i1), borderColor: 'orange' },
          { key: 'i2', label: 'I2', data: samples.map(p => p.i2), borderColor: 'purple' },
          { key: 'i3', label: 'I3', data: samples.map(p => p.i3), borderColor: 'teal' },
        ];

        setVoltageData({ labels, datasets: voltageDatasets });
        setCurrentData({ labels, datasets: currentDatasets });
        setScale(labels.length);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [selectedFile]);

  const toggleVisibility = key => {
    setVisible(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
      <div className="w-full max-w-3xl mx-auto my-4">
        <label className="flex flex-col items-center">
          <span>Horizontal scale</span>
          <input
            type="range"
            min={1}
            max={voltageData?.labels.length || 1000}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="w-full"
          />
        </label>
      </div>
      {voltageData && currentData ? (
        <div className="flex flex-col items-center space-y-8">
          <div className="w-full max-w-3xl">
            <h2 className="text-center mb-2">Voltage</h2>
            <Line
              data={{
                labels: voltageData.labels.slice(0, scale),
                datasets: voltageData.datasets
                  .filter(ds => visible[ds.key])
                  .map(ds => ({ ...ds, tension: 0.1, data: ds.data.slice(0, scale) })),
              }}
            />
            <div className="flex justify-center gap-4 mt-2">
              {['v1', 'v2', 'v3'].map(key => (
                <label key={key} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={visible[key]}
                    onChange={() => toggleVisibility(key)}
                  />
                  {key.toUpperCase()}
                </label>
              ))}
            </div>
          </div>
          <div className="w-full max-w-3xl">
            <h2 className="text-center mb-2">Current</h2>
            <Line
              data={{
                labels: currentData.labels.slice(0, scale),
                datasets: currentData.datasets
                  .filter(ds => visible[ds.key])
                  .map(ds => ({ ...ds, tension: 0.1, data: ds.data.slice(0, scale) })),
              }}
            />
            <div className="flex justify-center gap-4 mt-2">
              {['i1', 'i2', 'i3'].map(key => (
                <label key={key} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={visible[key]}
                    onChange={() => toggleVisibility(key)}
                  />
                  {key.toUpperCase()}
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p>Loading data...</p>
      )}
    </div>
  );
};

export default GraphPage;
