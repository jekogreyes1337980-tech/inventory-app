export default function MetricCard({ icon, iconVariant = 'indigo', title, value }) {
  return (
    <div className="glass-card metric-card">
      <div className={`metric-icon ${iconVariant}`}>{icon}</div>
      <div className="metric-data">
        <span className="metric-title">{title}</span>
        <span className="metric-value">{value}</span>
      </div>
    </div>
  );
}
