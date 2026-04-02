import { useState, useMemo } from 'react';

export function useSortPaginate(data, defaultPerPage = 10) {
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const sorted = useMemo(() => {
    if (!sortField) return [...data];
    return [...data].sort((a, b) => {
      const av = (a[sortField] ?? '').toString().toLowerCase();
      const bv = (b[sortField] ?? '').toString().toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * perPage, safePage * perPage);

  // Reset to page 1 when data length changes (e.g. after search)
  useMemo(() => { setPage(1); }, [data.length]);

  const SortBtn = ({ field, children }) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        color: 'inherit',
        fontWeight: 'inherit',
        fontSize: 'inherit',
        padding: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
      <span style={{ opacity: sortField === field ? 1 : 0.3, fontSize: '0.75em' }}>
        {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
      </span>
    </button>
  );

  return {
    sortField, sortDir, handleSort, SortBtn,
    page: safePage, setPage, perPage, setPerPage,
    totalPages, paginated, totalItems: sorted.length,
  };
}

export function Pagination({ page, totalPages, totalItems, perPage, setPage, setPerPage }) {
  const start = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, totalItems);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        <span>Rows per page:</span>
        <select
          value={perPage}
          onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
          style={{ padding: '0.2rem 0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.875rem', cursor: 'pointer' }}
        >
          {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>{start}–{end} of {totalItems}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          onClick={() => setPage(1)}
          disabled={page === 1}
          style={{ padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
        >«</button>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          style={{ padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
        >‹</button>

        {/* Page number buttons */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce((acc, p, idx, arr) => {
            if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} style={{ padding: '0.3rem 0.4rem', color: 'var(--text-muted)' }}>…</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  padding: '0.3rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: p === page ? 'var(--primary)' : 'var(--surface)',
                  color: p === page ? 'white' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: p === page ? 600 : 400,
                  minWidth: '2rem',
                }}
              >{p}</button>
            )
          )}

        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          style={{ padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
        >›</button>
        <button
          onClick={() => setPage(totalPages)}
          disabled={page === totalPages}
          style={{ padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
        >»</button>
      </div>
    </div>
  );
}
