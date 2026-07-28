export default function ProgressBar({ label, valueLabel, targetLabel, pct, color }) {
  return (
    <div className="bar-row">
      <div className="bar-labels">
        <span>{label}</span>
        <span>
          <span className="bar-value">{valueLabel}</span>
          {targetLabel && <span className="bar-target"> {targetLabel}</span>}
        </span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, background: color }} />
      </div>
    </div>
  );
}
