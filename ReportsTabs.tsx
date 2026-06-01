'use client';
import { useState } from 'react';
import { format, getQuarter, getYear } from 'date-fns';

type Item = {
  id: string;
  description: string;
  category: string;
  storage_location: string;
  current_quantity: number;
  updated_at: string;
};

type CheckIn = {
  id: string;
  date_received: string;
  quantity: number;
  condition: string;
  fmv_per_unit: number;
  total_fmv: number;
  inventory_items: { description: string; category: string } | null;
  donors: { name: string; organization: string | null } | null;
};

type CheckOut = {
  id: string;
  date_given: string;
  quantity: number;
  client_first_name: string;
  client_last_name: string;
  program: string;
  hmis_number: string | null;
  inventory_items: { description: string; category: string } | null;
  profiles: { full_name: string } | null;
};

type Donor = {
  id: string;
  name: string;
  organization: string | null;
  email: string | null;
};

function downloadCSV(filename: string, rows: string[][]) {
  const content = rows.map(r => r.map(c => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsTabs({
  items,
  checkIns,
  checkOuts,
  donors,
}: {
  items: Item[];
  checkIns: CheckIn[];
  checkOuts: CheckOut[];
  donors: Donor[];
}) {
  const [tab, setTab] = useState<'inventory' | 'quarterly' | 'clients' | 'donors'>('inventory');
  const [clientSearch, setClientSearch] = useState('');
  const [donorSearch, setDonorSearch] = useState('');

  const tabs = [
    { key: 'inventory', label: 'Inventory' },
    { key: 'quarterly', label: 'Quarterly Value' },
    { key: 'clients', label: 'By Client' },
    { key: 'donors', label: 'By Donor' },
  ] as const;

  // Group items by location
  const byLocation: Record<string, Item[]> = {};
  items.forEach(item => {
    if (!byLocation[item.storage_location]) byLocation[item.storage_location] = [];
    byLocation[item.storage_location].push(item);
  });

  // Quarterly FMV
  type QuarterKey = string;
  const quarterlyMap: Record<QuarterKey, number> = {};
  checkIns.forEach(ci => {
    const d = new Date(ci.date_received);
    const key = `${getYear(d)} Q${getQuarter(d)}`;
    quarterlyMap[key] = (quarterlyMap[key] ?? 0) + (ci.total_fmv ?? 0);
  });
  const quarterlyRows = Object.entries(quarterlyMap).sort((a, b) => b[0].localeCompare(a[0]));

  // Client search
  const clientResults = clientSearch.trim().length >= 2
    ? checkOuts.filter(co =>
        `${co.client_first_name} ${co.client_last_name}`.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (co.hmis_number ?? '').includes(clientSearch)
      )
    : [];

  // Donor search
  const donorResults = donorSearch.trim().length >= 2
    ? checkIns.filter(ci =>
        ci.donors?.name.toLowerCase().includes(donorSearch.toLowerCase()) ||
        (ci.donors?.organization ?? '').toLowerCase().includes(donorSearch.toLowerCase())
      )
    : [];

  function exportInventoryCSV() {
    downloadCSV('fpgwc-inventory.csv', [
      ['Description', 'Category', 'Location', 'Qty in Stock', 'Last Updated'],
      ...items.map(i => [
        i.description, i.category, i.storage_location,
        String(i.current_quantity),
        format(new Date(i.updated_at), 'yyyy-MM-dd'),
      ]),
    ]);
  }

  function exportQuarterlyCSV() {
    downloadCSV('fpgwc-quarterly-fmv.csv', [
      ['Quarter', 'Total FMV ($)'],
      ...quarterlyRows.map(([q, v]) => [q, v.toFixed(2)]),
    ]);
  }

  function exportCheckInsCSV() {
    downloadCSV('fpgwc-check-ins.csv', [
      ['Date', 'Item', 'Category', 'Donor', 'Organization', 'Qty', 'Condition', 'FMV/Unit', 'Total FMV'],
      ...checkIns.map(ci => [
        ci.date_received,
        ci.inventory_items?.description ?? '',
        ci.inventory_items?.category ?? '',
        ci.donors?.name ?? '',
        ci.donors?.organization ?? '',
        String(ci.quantity),
        ci.condition,
        ci.fmv_per_unit?.toFixed(2) ?? '',
        ci.total_fmv?.toFixed(2) ?? '',
      ]),
    ]);
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Inventory by Location */}
      {tab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={exportInventoryCSV}
              className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              ⬇ Export CSV
            </button>
          </div>
          {Object.entries(byLocation).map(([loc, locItems]) => (
            <div key={loc} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">{loc}</h3>
                <span className="text-sm text-green-700 font-medium">
                  {locItems.reduce((s, i) => s + i.current_quantity, 0)} total items
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {locItems.map(item => (
                  <div key={item.id} className="px-5 py-3 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium text-gray-900">{item.description}</span>
                      <span className="text-gray-400 ml-2">({item.category})</span>
                    </div>
                    <span className={`font-bold px-2 py-0.5 rounded-full ${
                      item.current_quantity === 0
                        ? 'bg-red-100 text-red-600'
                        : item.current_quantity < 3
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {item.current_quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quarterly FMV */}
      {tab === 'quarterly' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Total FMV of all donations received, by quarter</p>
            <button
              onClick={exportQuarterlyCSV}
              className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              ⬇ Export CSV
            </button>
          </div>
          <div className="flex justify-end">
            <button
              onClick={exportCheckInsCSV}
              className="text-sm border border-green-300 text-green-700 px-4 py-2 rounded-xl hover:bg-green-50 transition-colors font-medium"
            >
              ⬇ Export All Check-Ins CSV
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {quarterlyRows.length === 0 ? (
              <p className="text-gray-400 text-sm px-5 py-8 text-center">No donations recorded yet.</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Quarter</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total FMV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {quarterlyRows.map(([q, v]) => (
                    <tr key={q}>
                      <td className="px-5 py-3.5 font-medium text-gray-900">{q}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-green-700">
                        ${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-5 py-3 text-gray-900">All Time Total</td>
                    <td className="px-5 py-3 text-right text-green-800">
                      ${quarterlyRows.reduce((s, [, v]) => s + v, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* By Client */}
      {tab === 'clients' && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search by client name or HMIS number…"
            value={clientSearch}
            onChange={e => setClientSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-base"
          />
          {clientSearch.trim().length >= 2 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {clientResults.length === 0 ? (
                <p className="text-gray-400 text-sm px-5 py-6 text-center">No check-outs found for this client.</p>
              ) : (
                <>
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                    {clientResults.length} record{clientResults.length !== 1 ? 's' : ''} found
                  </div>
                  <div className="divide-y divide-gray-100">
                    {clientResults.map(co => (
                      <div key={co.id} className="px-5 py-3.5 text-sm">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 items-start justify-between">
                          <div>
                            <span className="font-medium text-gray-900">{co.client_first_name} {co.client_last_name}</span>
                            {co.hmis_number && (
                              <span className="ml-2 text-xs text-gray-400">HMIS: {co.hmis_number}</span>
                            )}
                            <p className="text-gray-600 mt-0.5">
                              {co.inventory_items?.description} · {co.program} · Qty: {co.quantity}
                            </p>
                          </div>
                          <span className="text-gray-400 text-xs">{format(new Date(co.date_given), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* By Donor */}
      {tab === 'donors' && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search by donor name or organization…"
            value={donorSearch}
            onChange={e => setDonorSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-base"
          />
          {donorSearch.trim().length >= 2 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {donorResults.length === 0 ? (
                <p className="text-gray-400 text-sm px-5 py-6 text-center">No donations found for this donor.</p>
              ) : (
                <>
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-sm text-gray-500">
                    <span>{donorResults.length} donation record{donorResults.length !== 1 ? 's' : ''}</span>
                    <span className="font-medium text-green-700">
                      Total FMV: ${donorResults.reduce((s, c) => s + (c.total_fmv ?? 0), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {donorResults.map(ci => (
                      <div key={ci.id} className="px-5 py-3.5 text-sm">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 items-start justify-between">
                          <div>
                            <span className="font-medium text-gray-900">{ci.donors?.name}</span>
                            {ci.donors?.organization && (
                              <span className="ml-2 text-xs text-gray-400">{ci.donors.organization}</span>
                            )}
                            <p className="text-gray-600 mt-0.5">
                              {ci.inventory_items?.description} · {ci.condition} · Qty: {ci.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-green-700 font-semibold">${ci.total_fmv?.toFixed(2)}</span>
                            <p className="text-gray-400 text-xs mt-0.5">{format(new Date(ci.date_received), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
