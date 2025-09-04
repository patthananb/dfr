'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
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

const DEFAULT_SCALE = 100;

const formatLabel = str =>
  str
    ? str
        .split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : '';

const formatDate = dateStr => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const formatTime = timeStr => (timeStr ? timeStr.slice(0, 5) : '');

const GraphContent = () => {
  const searchParams = useSearchParams();
  const fileParam = searchParams.get('file');
  const [voltageData, setVoltageData] = useState(null);
  const [currentData, setCurrentData] = useState(null);
  const [abData, setAbData] = useState(null);
  const [filenames, setFilenames] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [visible, setVisible] = useState({
    v1: true,
    v2: true,
    v3: true,
    i1: true,
    i2: true,
    i3: true,
    A: true,
    B: true,
  });
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [offset, setOffset] = useState(0);
  const [faultInfo, setFaultInfo] = useState({
    faultType: '',
    date: '',
    time: '',
    faultLocation: '',
  });

  const maxOffset = Math.max(0, (voltageData?.labels.length || 0) - scale);

  const adjustOffset = delta => {
    setOffset(prev => {
      const next = prev + delta;
      if (next < 0) return 0;
      if (next > maxOffset) return maxOffset;
      return next;
    });
  };

  const holdRef = useRef(null);

  const startHoldAdjust = delta => {
    adjustOffset(delta);
    holdRef.current = setInterval(() => adjustOffset(delta), 150);
  };

  const stopHoldAdjust = () => {
    if (holdRef.current) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopHoldAdjust();
  }, []);

  useEffect(() => {
    const fetchFilenames = async () => {
      try {
        const res = await fetch('/api/data');
        const data = await res.json();
        if (data.success) {
          const files = data.filenames.filter(name => name !== '.gitkeep');
          setFilenames(files);
          if (files.length > 0) {
            if (fileParam && files.includes(fileParam)) {
              setSelectedFile(fileParam);
            } else {
              setSelectedFile(files[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching filenames:', error);
      }
    };
    fetchFilenames();
  }, [fileParam]);

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

        const { faultType, date, time, faultLocation } = json;
        setFaultInfo({ faultType, date, time, faultLocation });

        const samples = json.data;
        const labels = samples.map(p => p.n);

        const voltageDatasets = [
          { key: 'v1', label: 'V1', data: samples.map(p => p.v1), borderColor: 'red' },
          { key: 'v2', label: 'V2', data: samples.map(p => p.v2), borderColor: 'green' },
          { key: 'v3', label: 'V3', data: samples.map(p => p.v3), borderColor: 'blue' },
        ].map(ds => ({ ...ds, min: Math.min(...ds.data), max: Math.max(...ds.data) }));
          const currentDatasets = [
            { key: 'i1', label: 'I1', data: samples.map(p => p.i1), borderColor: 'orange' },
            { key: 'i2', label: 'I2', data: samples.map(p => p.i2), borderColor: 'purple' },
            { key: 'i3', label: 'I3', data: samples.map(p => p.i3), borderColor: 'teal' },
          ].map(ds => ({ ...ds, min: Math.min(...ds.data), max: Math.max(...ds.data) }));
          const abDatasets = [
            { key: 'A', label: 'A', data: samples.map(p => p.A), borderColor: 'yellow' },
            { key: 'B', label: 'B', data: samples.map(p => p.B), borderColor: 'pink' },
          ].map(ds => ({ ...ds, min: Math.min(...ds.data), max: Math.max(...ds.data) }));

          setVoltageData({ labels, datasets: voltageDatasets });
          setCurrentData({ labels, datasets: currentDatasets });
          setAbData({ labels, datasets: abDatasets });
        setScale(Math.min(labels.length, DEFAULT_SCALE));
        setOffset(0);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [selectedFile]);

  useEffect(() => {
    if (voltageData) {
      const maxOffset = Math.max(0, voltageData.labels.length - scale);
      setOffset(prev => Math.min(prev, maxOffset));
    }
  }, [scale, voltageData]);

  const toggleVisibility = key => {
    setVisible(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col flex-1 p-4 sm:p-8 text-gray-100">
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg p-6 w-full">
        <h1 className="text-2xl font-semibold mb-4 text-center">Sensor Data</h1>
        <div className="flex justify-center mb-4">
          <select
            className="bg-gray-800 text-white p-2 rounded w-full max-w-xs"
            onChange={(e) => setSelectedFile(e.target.value)}
            value={selectedFile}
          >
            {filenames.map(file => (
              <option key={file} value={file}>
                {file}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full max-w-3xl mx-auto my-4">
          <label className="flex flex-col items-center">
            <span>Horizontal scale</span>
            <input
              type="range"
              min={1}
              max={voltageData?.labels.length || DEFAULT_SCALE}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-full"
            />
          </label>
        </div>
        <div className="w-full max-w-3xl mx-auto my-4">
          <label className="flex flex-col items-center">
            <span>Horizontal offset</span>
            <div className="flex items-center w-full gap-2">
              <button
                type="button"
                onMouseDown={() => startHoldAdjust(-1)}
                onMouseUp={stopHoldAdjust}
                onMouseLeave={stopHoldAdjust}
                onTouchStart={() => startHoldAdjust(-1)}
                onTouchEnd={stopHoldAdjust}
                className="px-2 py-1 bg-gray-700 rounded text-white"
              >
                -
              </button>
              <input
                type="range"
                min={0}
                max={maxOffset}
                value={offset}
                onChange={(e) => setOffset(Number(e.target.value))}
                className="flex-grow"
              />
              <button
                type="button"
                onMouseDown={() => startHoldAdjust(1)}
                onMouseUp={stopHoldAdjust}
                onMouseLeave={stopHoldAdjust}
                onTouchStart={() => startHoldAdjust(1)}
                onTouchEnd={stopHoldAdjust}
                className="px-2 py-1 bg-gray-700 rounded text-white"
              >
                +
              </button>
            </div>
          </label>
        </div>
        {voltageData && currentData && abData ? (
          <div className="flex flex-col lg:flex-row w-full max-w-5xl mx-auto">
          <div className="flex flex-col items-center space-y-8 flex-grow">
            <div className="w-full max-w-3xl">
              <h2 className="text-center mb-2">Voltage</h2>
              <Line
                data={{
                  labels: voltageData.labels.slice(offset, offset + scale),
                  datasets: voltageData.datasets
                    .filter(ds => visible[ds.key])
                    .map(ds => ({ ...ds, tension: 0.1, data: ds.data.slice(offset, offset + scale) })),
                }}
                options={{
                  animation: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: { tooltip: { enabled: true } },
                  scales: {
                    y: {
                      title: {
                        display: true,
                        text: 'Voltage [V]'
                      }
                    }
                  }
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mt-2 text-center">
                {voltageData.datasets.map(ds => (
                  <div key={ds.key}>
                    {ds.label} Min: {ds.min.toFixed(2)} Max: {ds.max.toFixed(2)}
                  </div>
                ))}
              </div>
            </div>
              <div className="w-full max-w-3xl">
                <h2 className="text-center mb-2">Current</h2>
                <Line
                  data={{
                    labels: currentData.labels.slice(offset, offset + scale),
                    datasets: currentData.datasets
                      .filter(ds => visible[ds.key])
                      .map(ds => ({ ...ds, tension: 0.1, data: ds.data.slice(offset, offset + scale) })),
                  }}
                  options={{
                    animation: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { tooltip: { enabled: true } },
                    scales: {
                      y: {
                        title: {
                          display: true,
                          text: 'Current [A]'
                        }
                      }
                    }
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mt-2 text-center">
                  {currentData.datasets.map(ds => (
                    <div key={ds.key}>
                      {ds.label} Min: {ds.min.toFixed(2)} Max: {ds.max.toFixed(2)}
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full max-w-3xl">
                <h2 className="text-center mb-2">A & B</h2>
                <Line
                  data={{
                    labels: abData.labels.slice(offset, offset + scale),
                    datasets: abData.datasets
                      .filter(ds => visible[ds.key])
                      .map(ds => ({ ...ds, tension: 0.1, data: ds.data.slice(offset, offset + scale) })),
                  }}
                  options={{
                    animation: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { tooltip: { enabled: true } },
                    scales: {
                      y: {
                        title: {
                          display: true,
                          text: 'A/B'
                        }
                      }
                    }
                  }}
                />
                <div className="flex justify-center gap-4 mt-2">
                  {['A', 'B'].map(key => (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mt-2 text-center">
                  {abData.datasets.map(ds => (
                    <div key={ds.key}>
                      {ds.label} Min: {ds.min.toFixed(2)} Max: {ds.max.toFixed(2)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          <div className="w-full lg:w-64 lg:ml-4 mt-8 lg:mt-0">
            <h2 className="mb-2 font-semibold">Fault Info</h2>
            <p>
              <span className="font-medium">Fault Type:</span>{' '}
              {formatLabel(faultInfo.faultType)}
            </p>
            <p>
              <span className="font-medium">Date:</span>{' '}
              {formatDate(faultInfo.date)}
            </p>
            <p>
              <span className="font-medium">Time:</span>{' '}
              {formatTime(faultInfo.time)}
            </p>
            <p>
              <span className="font-medium">Location:</span>{' '}
              {formatLabel(faultInfo.faultLocation)}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-gray-300">Loading data...</p>
      )}
      </div>
    </div>
  );
};

const GraphPage = () => (
  <Suspense fallback={<p className="text-gray-300">Loading...</p>}>
    <GraphContent />
  </Suspense>
);

export default GraphPage;
