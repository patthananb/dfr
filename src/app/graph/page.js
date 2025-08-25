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
  const [meta, setMeta] = useState({
    faultType: '',
    faultLocation: '',
    date: '',
    time: '',
  });
  const [loading, setLoading] = useState(false);
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

      setLoading(true);
      try {
        const res = await fetch(`/api/data?file=${selectedFile}`);
        const data = await res.json();

        if (data.success && data.file && Array.isArray(data.file.data)) {
          const allData = data.file.data.map(pt => ({
            n: Number(pt.n),
            V1: Number(pt.V1),
            V2: Number(pt.V2),
            V3: Number(pt.V3),
            I1: Number(pt.I1),
            I2: Number(pt.I2),
            I3: Number(pt.I3),
          }));

          allData.sort((a, b) => a.n - b.n);
          setDataPoints(allData);
          setMeta({
            faultType: data.file.faultType || '',
            faultLocation: data.file.faultLocation || '',
            date: data.file.date || '',
            time: data.file.time || '',
          });
        } else {
          setDataPoints([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setDataPoints([]);
      } finally {
        setLoading(false);
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
      {meta.faultType && (
        <div className="mb-4 text-sm">
          <p><strong>Fault Type:</strong> {meta.faultType}</p>
          <p><strong>Fault Location:</strong> {meta.faultLocation}</p>
          <p><strong>Date:</strong> {meta.date}</p>
          <p><strong>Time:</strong> {meta.time}</p>
        </div>
      )}
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
      {loading ? (
        <p>Loading data...</p>
      ) : voltageChart && currentChart ? (
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
        <p>No data available.</p>
      )}
    </div>
  );
};

export default GraphPage;
