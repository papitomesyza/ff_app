import { fmtMoney } from '../finance.js';

export default function FlowRing({ label, value, target, currency, color = 'var(--accent)', size = 84 }) {
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const dash = circumference * pct;

  return (
    <div className="ring-tile">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-strong)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          letterSpacing="-0.3"
          fill="var(--text)"
        >
          {fmtMoney(Math.round(value), currency)}
        </text>
        <text x="50%" y="64%" textAnchor="middle" fontSize="9" fontWeight="500" fill="var(--text-dim)">
          /{fmtMoney(Math.round(target), currency)}
        </text>
      </svg>
      <div className="ring-label">{label}</div>
    </div>
  );
}
