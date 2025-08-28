"use client";
import React from 'react';

export type RangeVal = '1d' | '7d' | '30d';

export default function RangeButtons({ value, onChange, className = '' }: { value: RangeVal; onChange: (v: RangeVal) => void; className?: string }) {
  const btn = (v: RangeVal, label: string) => (
    <button
      key={v}
      onClick={() => onChange(v)}
      className={`px-2.5 py-1 text-sm rounded border transition-colors ${
        value === v ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-black border-gray-900 dark:border-gray-100' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-black/5 border-gray-300 dark:border-gray-700'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {btn('1d', '1日')}
      {btn('7d', '7日')}
      {btn('30d', '30日')}
    </div>
  );
}

