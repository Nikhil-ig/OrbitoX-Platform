'use client';

import React, { Suspense } from 'react';
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
  title?: string;
}

export function DynamicTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  title,
}: DynamicTableProps<T>) {
  return (
    <Suspense fallback={<div className="p-8 text-center animate-pulse">Loading table data...</div>}>
      <div className="rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {title && (
          <div className="px-6 py-5 border-b border-gray-200/50">
            <h3 className="text-xl font-bold leading-6 text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              {title}
            </h3>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200/50">
            <thead className="bg-white/30 backdrop-blur-sm">
              <tr>
                {columns.map((col) => (
                  <th 
                    key={col.key} 
                    scope="col" 
                    className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50 bg-transparent">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-gray-500 font-medium">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      No records found.
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr
                    key={idx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-all duration-200 ease-in-out ${
                      onRowClick 
                        ? 'cursor-pointer hover:bg-white/60 hover:shadow-inner hover:scale-[1.002] transform' 
                        : ''
                    }`}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Suspense>
  );
}
