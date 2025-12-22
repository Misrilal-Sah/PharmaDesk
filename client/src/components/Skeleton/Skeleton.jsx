import './Skeleton.css';

// Basic skeleton shapes
export function Skeleton({ width, height, radius = 'var(--radius-sm)', className = '' }) {
  return (
    <div 
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

// Text line skeleton
export function SkeletonText({ lines = 1, width = '100%' }) {
  return (
    <div className="skeleton-text">
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className="skeleton skeleton-line" 
          style={{ width: i === lines - 1 && lines > 1 ? '70%' : width }}
        />
      ))}
    </div>
  );
}

// Avatar skeleton
export function SkeletonAvatar({ size = 40 }) {
  return (
    <div 
      className="skeleton skeleton-avatar" 
      style={{ width: size, height: size }}
    />
  );
}

// Card skeleton
export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card-header">
        <SkeletonAvatar size={48} />
        <div className="skeleton-card-info">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

// Table row skeleton
export function SkeletonTableRow({ columns = 5 }) {
  return (
    <tr className="skeleton-table-row">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i}>
          <Skeleton 
            width={i === 0 ? '80%' : i === columns - 1 ? '60px' : '70%'} 
            height={16} 
          />
        </td>
      ))}
    </tr>
  );
}

// Stats card skeleton
export function SkeletonStatCard() {
  return (
    <div className="skeleton-stat-card">
      <div className="skeleton-stat-icon">
        <Skeleton width={48} height={48} radius="var(--radius-lg)" />
      </div>
      <div className="skeleton-stat-info">
        <Skeleton width="40%" height={24} />
        <Skeleton width="60%" height={14} />
      </div>
    </div>
  );
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <div className="skeleton-stats-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <div className="skeleton-content-grid">
        <div className="skeleton-section">
          <Skeleton width="150px" height={24} />
          <div className="skeleton-list">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
        <div className="skeleton-section">
          <Skeleton width="150px" height={24} />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="skeleton-table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i}><Skeleton width="80%" height={14} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Skeleton;
