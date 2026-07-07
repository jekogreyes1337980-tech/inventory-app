const VARIANTS = {
  indigo: 'badge-indigo',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  muted: 'badge-muted',
};

export default function Badge({ variant = 'indigo', children, className = '' }) {
  return (
    <span className={`badge ${VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  );
}
