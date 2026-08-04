import React from 'react';
import { Button } from '../components/button';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

export interface DynamicTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
}

export function DynamicTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
}: DynamicTableProps<T>) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md, 10px)', border: '1px solid var(--border-glass, rgba(255,255,255,0.08))' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
        <thead>
          <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-glass, rgba(255,255,255,0.08))' }}>
            {columns.map((col) => (
              <th key={col.key} style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary, #9ca3af)' }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>
                No records found.
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick && onRowClick(row)}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.15s ease',
                }}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: '14px 18px', color: 'var(--text-primary, #ffffff)' }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
