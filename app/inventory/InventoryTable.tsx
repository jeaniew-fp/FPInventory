'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ITEM_CATEGORIES, STORAGE_LOCATIONS, CHECK_IN_PROGRAMS } from '@/lib/constants';
import { format } from 'date-fns';

type Item = {
  id: string;
  description: string;
  category: string;
  storage_location: string;
  program: string;
  current_quantity: number;
  updated_at: string;
};

export default function InventoryTable({ items }: { items: Item[] }) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterProgram, setFilterProgram] = useState('');

  const filtered = items.filter(item => {
    const matchSearch = !search || item.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || item.category === filterCategory;
    const matchLoc = !filterLocation || item.storage_location === filterLocation;
    const matchProg = !filterProgram || item.program === filterProgram;
    return matchSearch && matchCat && matchLoc && matchProg;
  });

  const hasFilters = search || filterCategory || filterLocation || filterProgram;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
        <input
          type="text"
          placeholder="Search by description…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-sm bg-white"
          >
            <option value="">All Categories</option>
            {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterLocation}
            onChange={e => setFilterLocation(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-sm bg-white"
          >
            <option value="">All Locations</option>
            {STORAGE_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <select
          value={filterProgram}
          onChange={e => setFilterProgram(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-sm bg-white"
        >
          <option value="">All Programs</option>
          {CHECK_IN_PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setFilterCategory(''); setFilterLocation(''); setFilterProgram(''); }}
            className="text-xs text-gray-500 hover:text-red-500 underline"
          >
            Clear filters ({filtered.length} result{filtered.length !== 1 ? 's' : ''})
          </button>
        )}
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📦</p>
            <p>No items match your filters</p>
          </div>
        ) : (
          filtered.map(item => (
            <Link key={item.id} href={`/inventory/${item.id}`}>
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-green-300 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{item.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.category}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.storage_location}</p>
                    {item.program && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                        {item.program}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-sm font-bold ${
                      item.current_quantity === 0
                        ? 'bg-red-100 text-red-600'
                        : item.current_quantity < 3
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {item.current_quantity}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(item.updated_at), 'MM/dd/yy')}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2">📦</p>
            <p>No items match your filters</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Program</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => window.location.href = `/inventory/${item.id}`}
                >
                  <td className="px-5 py-3.5 font-medium text-gray-900 text-sm">{item.description}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{item.category}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{item.storage_location}</td>
                  <td className="px-5 py-3.5 text-sm">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      {item.program ?? 'General'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-sm font-bold ${
                      item.current_quantity === 0
                        ? 'bg-red-100 text-red-600'
                        : item.current_quantity < 3
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {item.current_quantity}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-400 text-right">
                    {format(new Date(item.updated_at), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
