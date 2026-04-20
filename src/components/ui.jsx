"use client";

import { useEffect } from "react";

export const Icon = ({ name, size = 14, style }) => {
  const s = { width: size, height: size, display: "inline-block", verticalAlign: "middle", ...style };
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    overview: <g {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></g>,
    wave:     <g {...p}><path d="M2 12 L5 12 L7 4 L10 20 L13 8 L15 16 L17 12 L22 12"/></g>,
    sites:    <g {...p}><path d="M4 21V9l8-6 8 6v12"/><path d="M9 21v-7h6v7"/></g>,
    firmware: <g {...p}><rect x="3" y="5" width="18" height="14"/><path d="M7 9h2M7 12h6M7 15h4"/><circle cx="17" cy="15" r="1.5" fill="currentColor"/></g>,
    plus:     <g {...p}><path d="M12 5v14M5 12h14"/></g>,
    book:     <g {...p}><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z"/><path d="M8 7h8M8 11h8M8 15h5"/></g>,
    search:   <g {...p}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></g>,
    arrow:    <g {...p}><path d="M5 12h14M13 6l6 6-6 6"/></g>,
    play:     <g {...p}><path d="M7 4v16l13-8z" fill="currentColor"/></g>,
    pause:    <g {...p}><path d="M7 4h4v16H7zM13 4h4v16h-4z" fill="currentColor"/></g>,
    close:    <g {...p}><path d="M6 6l12 12M18 6L6 18"/></g>,
    check:    <g {...p}><path d="M4 12l5 5L20 6"/></g>,
    menu:     <g {...p}><path d="M4 6h16M4 12h16M4 18h16"/></g>,
    upload:   <g {...p}><path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 16v4h16v-4"/></g>,
    download: <g {...p}><path d="M12 4v12M6 10l6 6 6-6"/><path d="M4 16v4h16v-4"/></g>,
    bolt:     <g {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none"/></g>,
    alert:    <g {...p}><path d="M12 2L2 21h20z"/><path d="M12 9v5M12 17v.5"/></g>,
    sun:      <g {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></g>,
    moon:     <g {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4 7 7 0 0 0 20 14.5z"/></g>,
    cog:      <g {...p}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.3l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2.3-1.3L14 3h-4l-.3 2.4a7 7 0 0 0-2.3 1.3l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.6l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2.3 1.3l.3 2.4h4l.3-2.4a7 7 0 0 0 2.3-1.3l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.3z"/></g>,
    circle:   <g {...p}><circle cx="12" cy="12" r="9"/></g>,
    trash:    <g {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></g>,
    edit:     <g {...p}><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M14 6l4 4"/></g>,
    chevron:  <g {...p}><path d="M9 6l6 6-6 6"/></g>,
    back:     <g {...p}><path d="M19 12H5M11 18l-6-6 6-6"/></g>,
    pin:      <g {...p}><path d="M12 2v10M5 14h14M9 22l3-8 3 8"/></g>,
  };
  return <svg viewBox="0 0 24 24" style={s}>{paths[name] || paths.circle}</svg>;
};

export const Panel = ({ title, right, children, className = "", bodyClass = "", style }) => (
  <div className={`panel ${className}`} style={style}>
    {(title || right) && (
      <div className="panel-head">
        <div className="panel-title">{title}</div>
        {right}
      </div>
    )}
    <div className={`panel-body ${bodyClass}`}>{children}</div>
  </div>
);

export const Kicker = ({ children }) => <div className="t-kicker">{children}</div>;

export const Metric = ({ label, value, unit, delta, flavor, mono = true }) => (
  <div className={`metric ${flavor || ""}`}>
    <div className="label">{label}</div>
    <div className="value" style={mono ? {} : { fontFamily: "inherit" }}>
      {value}{unit && <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 6 }}>{unit}</span>}
    </div>
    {delta && <div className={`delta ${delta.dir || ""}`}>{delta.text}</div>}
  </div>
);

export const Badge = ({ children, tone = "" }) => <span className={`badge ${tone}`}>{children}</span>;

export const Dot = ({ tone = "" }) => <span className={`dot ${tone}`} />;

export const Button = ({ variant = "", size = "", children, onClick, disabled, type = "button", ...rest }) => (
  <button type={type} className={`btn ${variant} ${size}`.trim()} onClick={onClick} disabled={disabled} {...rest}>
    {children}
  </button>
);

export const Field = ({ label, children, hint }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
    {hint && <span className="t-mono-xs t-mute" style={{ marginTop: 2 }}>{hint}</span>}
  </label>
);

export const TabGroup = ({ value, onChange, options }) => (
  <div className="btn-group">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        className={`btn sm ${value === o.value ? "active" : ""}`}
        onClick={() => onChange(o.value)}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export const Sparkline = ({ values, color = "var(--accent)", w = 80, h = 20 }) => {
  if (!values?.length) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1" />
    </svg>
  );
};

export const Toast = ({ message, tone = "info", onClose }) => {
  useEffect(() => {
    if (message) {
      const t = setTimeout(onClose, 4000);
      return () => clearTimeout(t);
    }
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className="toast">
      <Dot tone={tone === "error" ? "alert" : tone === "success" ? "ok" : ""} />
      <span>{message}</span>
    </div>
  );
};

export function formatLabel(str) {
  if (!str) return "";
  return str.split("_").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
}
export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024,
    sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
export function formatUptime(sec) {
  if (!sec) return "—";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}
export function formatRelTime(value) {
  if (!value) return "—";
  const ms = typeof value === "number" ? value : Date.parse(value);
  if (Number.isNaN(ms)) return "—";
  const d = Date.now() - ms;
  const s = Math.floor(d / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
