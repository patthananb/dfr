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
      <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 p-6 sm:p-8 w-full">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-center bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Sensor Data</h1>
        <div className="flex justify-center mb-6">
          <select
            className="bg-slate-800 text-white p-3 rounded-xl w-full max-w-md border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all duration-200 cursor-pointer hover:bg-slate-750"
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
        <div className="w-full max-w-3xl mx-auto my-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <label className="flex flex-col items-center">
            <span className="text-lg font-medium mb-3 text-gray-300">Horizontal Scale</span>
            <input
              type="range"
              min={1}
              max={voltageData?.labels.length || DEFAULT_SCALE}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
            />
          </label>
        </div>
        <div className="w-full max-w-3xl mx-auto my-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <label className="flex flex-col items-center">
            <span className="text-lg font-medium mb-3 text-gray-300">Horizontal Offset</span>
            <div className="flex items-center w-full gap-3">
              <button
                type="button"
                onMouseDown={() => startHoldAdjust(-1)}
                onMouseUp={stopHoldAdjust}
                onMouseLeave={stopHoldAdjust}
                onTouchStart={() => startHoldAdjust(-1)}
                onTouchEnd={stopHoldAdjust}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-lg text-white font-bold transition-all duration-200 shadow-lg hover:shadow-blue-500/50 transform hover:scale-105"
              >
                −
              </button>
              <input
                type="range"
                min={0}
                max={maxOffset}
                value={offset}
                onChange={(e) => setOffset(Number(e.target.value))}
                className="flex-grow h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
              />
              <button
                type="button"
                onMouseDown={() => startHoldAdjust(1)}
                onMouseUp={stopHoldAdjust}
                onMouseLeave={stopHoldAdjust}
                onTouchStart={() => startHoldAdjust(1)}
                onTouchEnd={stopHoldAdjust}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-lg text-white font-bold transition-all duration-200 shadow-lg hover:shadow-blue-500/50 transform hover:scale-105"
              >
                +
              </button>
            </div>
          </label>
        </div>
        {voltageData && currentData && abData ? (
          <div className="flex flex-col lg:flex-row w-full max-w-5xl mx-auto gap-6">
          <div className="flex flex-col items-center space-y-8 flex-grow">
            <div className="w-full max-w-3xl bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <h2 className="text-center mb-4 text-2xl font-bold text-blue-400">Voltage</h2>
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
              <div className="flex justify-center gap-6 mt-4">
                {['v1', 'v2', 'v3'].map(key => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform">
                    <input
                      type="checkbox"
                      checked={visible[key]}
                      onChange={() => toggleVisibility(key)}
                      className="w-4 h-4 cursor-pointer accent-cyan-500"
                    />
                    <span className="font-medium">{key.toUpperCase()}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-4 text-center">
                {voltageData.datasets.map(ds => (
                  <div key={ds.key} className="bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                    <span className="font-semibold text-blue-400">{ds.label}</span> Min: <span className="text-cyan-400">{ds.min.toFixed(2)}</span> Max: <span className="text-cyan-400">{ds.max.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
              <div className="w-full max-w-3xl bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h2 className="text-center mb-4 text-2xl font-bold text-purple-400">Current</h2>
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
                <div className="flex justify-center gap-6 mt-4">
                  {['i1', 'i2', 'i3'].map(key => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform">
                      <input
                        type="checkbox"
                        checked={visible[key]}
                        onChange={() => toggleVisibility(key)}
                        className="w-4 h-4 cursor-pointer accent-cyan-500"
                      />
                      <span className="font-medium">{key.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-4 text-center">
                  {currentData.datasets.map(ds => (
                    <div key={ds.key} className="bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="font-semibold text-purple-400">{ds.label}</span> Min: <span className="text-cyan-400">{ds.min.toFixed(2)}</span> Max: <span className="text-cyan-400">{ds.max.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full max-w-3xl bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h2 className="text-center mb-4 text-2xl font-bold text-teal-400">A & B</h2>
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
                <div className="flex justify-center gap-6 mt-4">
                  {['A', 'B'].map(key => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform">
                      <input
                        type="checkbox"
                        checked={visible[key]}
                        onChange={() => toggleVisibility(key)}
                        className="w-4 h-4 cursor-pointer accent-cyan-500"
                      />
                      <span className="font-medium">{key.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mt-4 text-center">
                  {abData.datasets.map(ds => (
                    <div key={ds.key} className="bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="font-semibold text-teal-400">{ds.label}</span> Min: <span className="text-cyan-400">{ds.min.toFixed(2)}</span> Max: <span className="text-cyan-400">{ds.max.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          <div className="w-full lg:w-72 lg:ml-6 mt-8 lg:mt-0">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 sticky top-8">
              <h2 className="mb-4 text-2xl font-bold text-center bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Fault Info</h2>
              <div className="space-y-3">
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                  <span className="block text-sm text-gray-400 mb-1">Fault Type</span>
                  <span className="block font-semibold text-white">{formatLabel(faultInfo.faultType)}</span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                  <span className="block text-sm text-gray-400 mb-1">Date</span>
                  <span className="block font-semibold text-white">{formatDate(faultInfo.date)}</span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                  <span className="block text-sm text-gray-400 mb-1">Time</span>
                  <span className="block font-semibold text-white">{formatTime(faultInfo.time)}</span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                  <span className="block text-sm text-gray-400 mb-1">Location</span>
                  <span className="block font-semibold text-white">{formatLabel(faultInfo.faultLocation)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-300 text-center text-lg">Loading data...</p>
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
