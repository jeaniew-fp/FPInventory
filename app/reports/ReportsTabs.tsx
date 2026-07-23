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

  const inputStyle = { border: '1.5px solid #e3ddec', background: '#fbfafd', color: '#3a1f4a' };
  const cardStyle = { boxShadow: '0 10px 30px -18px rgba(58,31,74,.3)', border: '1px solid rgba(58,31,74,.05)' };
  const exportBtnStyle = { border: '1.5px solid #d6cee0', color: '#8b4a72', background: '#fff' };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1.5 rounded-2xl p-1.5 mb-5" style={{ background: '#efe9f4' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors"
            style={tab === t.key
              ? { background: '#fff', color: '#8b4a72', boxShadow: '0 4px 12px -6px rgba(58,31,74,.3)' }
              : { color: '#7a7085' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Inventory by Location */}
      {tab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={exportInventoryCSV} className="text-sm px-4 py-2 rounded-xl font-bold transition-colors hover:opacity-80" style={exportBtnStyle}>
              ↓ Export CSV
            </button>
          </div>
          {Object.entries(byLocation).map(([loc, locItems]) => (
            <div key={loc} className="bg-white rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(100deg,#f6f0d9,#f3e6f5)' }}>
                <h3 className="font-extrabold" style={{ color: '#3a1f4a' }}>{loc}</h3>
                <span className="font-extrabold text-sm" style={{ color: '#237347' }}>
                  {locItems.reduce((s, i) => s + i.current_quantity, 0)} total items
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: '#f2ede6' }}>
                {locItems.map(item => (
                  <div key={item.id} className="px-6 py-3.5 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-semibold" style={{ color: '#2a2333' }}>{item.description}</span>
                      <span className="ml-2" style={{ color: '#9a8fa0' }}>({item.category})</span>
                    </div>
                    <span
                      className="font-extrabold text-sm flex items-center justify-center rounded-full"
                      style={item.current_quantity === 0
                        ? { background: '#fde8e8', color: '#c0392b', width: 28, height: 28 }
                        : item.current_quantity < 3
                        ? { background: '#fff0d6', color: '#b5720a', width: 28, height: 28 }
                        : { background: '#fff0d6', color: '#b5720a', width: 28, height: 28 }}
                    >
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
            <p className="text-sm" style={{ color: '#8a7f92' }}>Total FMV of all donations received, by quarter</p>
            <button onClick={exportQuarterlyCSV} className="text-sm px-4 py-2 rounded-xl font-bold hover:opacity-80" style={exportBtnStyle}>
              ↓ Export CSV
            </button>
          </div>
          <div className="flex justify-end">
            <button onClick={exportCheckInsCSV} className="text-sm px-4 py-2 rounded-xl font-bold hover:opacity-80" style={exportBtnStyle}>
              ↓ Export All Check-Ins CSV
            </button>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden" style={cardStyle}>
            {quarterlyRows.length === 0 ? (
              <p className="text-sm px-5 py-8 text-center" style={{ color: '#a79fb0' }}>No donations recorded yet.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#f3eef8' }}>
                    <th className="text-left px-5 py-3 text-xs font-extrabold uppercase tracking-wider" style={{ color: '#8b4a72' }}>Quarter</th>
                    <th className="text-right px-5 py-3 text-xs font-extrabold uppercase tracking-wider" style={{ color: '#8b4a72' }}>Total FMV</th>
                  </tr>
                </thead>
                <tbody>
                  {quarterlyRows.map(([q, v]) => (
                    <tr key={q} style={{ borderTop: '1px solid #f2ede6' }}>
                      <td className="px-5 py-3.5 font-semibold" style={{ color: '#2a2333' }}>{q}</td>
                      <td className="px-5 py-3.5 text-right font-bold" style={{ color: '#237347' }}>
                        ${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f7f4fb', borderTop: '1px solid #f2ede6' }}>
                    <td className="px-5 py-3 font-extrabold" style={{ color: '#3a1f4a' }}>All Time Total</td>
                    <td className="px-5 py-3 text-right font-extrabold" style={{ color: '#237347' }}>
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
            className="w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-300"
            style={inputStyle}
          />
          {clientSearch.trim().length >= 2 && (
            <div className="bg-white rounded-2xl overflow-hidden" style={cardStyle}>
              {clientResults.length === 0 ? (
                <p className="text-sm px-5 py-6 text-center" style={{ color: '#a79fb0' }}>No check-outs found for this client.</p>
              ) : (
                <>
                  <div className="px-5 py-3 text-sm" style={{ background: '#f3eef8', color: '#8b4a72', borderBottom: '1px solid #f2ede6' }}>
                    {clientResults.length} record{clientResults.length !== 1 ? 's' : ''} found
                  </div>
                  <div>
                    {clientResults.map(co => (
                      <div key={co.id} className="px-5 py-3.5 text-sm" style={{ borderTop: '1px solid #f2ede6' }}>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 items-start justify-between">
                          <div>
                            <span className="font-semibold" style={{ color: '#2a2333' }}>{co.client_first_name} {co.client_last_name}</span>
                            {co.hmis_number && <span className="ml-2 text-xs" style={{ color: '#9a8fa0' }}>HMIS: {co.hmis_number}</span>}
                            <p className="mt-0.5" style={{ color: '#5d5468' }}>
                              {co.inventory_items?.description} · {co.program} · Qty: {co.quantity}
                            </p>
                          </div>
                          <span className="text-xs" style={{ color: '#9a8fa0' }}>{format(new Date(co.date_given), 'MMM d, yyyy')}</span>
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
            className="w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-300"
            style={inputStyle}
          />
          {donorSearch.trim().length >= 2 && (
            <div className="bg-white rounded-2xl overflow-hidden" style={cardStyle}>
              {donorResults.length === 0 ? (
                <p className="text-sm px-5 py-6 text-center" style={{ color: '#a79fb0' }}>No donations found for this donor.</p>
              ) : (
                <>
                  <div className="px-5 py-3 flex items-center justify-between text-sm" style={{ background: '#f3eef8', borderBottom: '1px solid #f2ede6' }}>
                    <span style={{ color: '#8b4a72' }}>{donorResults.length} donation record{donorResults.length !== 1 ? 's' : ''}</span>
                    <span className="font-bold" style={{ color: '#237347' }}>
                      Total FMV: ${donorResults.reduce((s, c) => s + (c.total_fmv ?? 0), 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    {donorResults.map(ci => (
                      <div key={ci.id} className="px-5 py-3.5 text-sm" style={{ borderTop: '1px solid #f2ede6' }}>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 items-start justify-between">
                          <div>
                            <span className="font-semibold" style={{ color: '#2a2333' }}>{ci.donors?.name}</span>
                            {ci.donors?.organization && <span className="ml-2 text-xs" style={{ color: '#9a8fa0' }}>{ci.donors.organization}</span>}
                            <p className="mt-0.5" style={{ color: '#5d5468' }}>
                              {ci.inventory_items?.description} · {ci.condition} · Qty: {ci.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold" style={{ color: '#237347' }}>${ci.total_fmv?.toFixed(2)}</span>
                            <p className="text-xs mt-0.5" style={{ color: '#9a8fa0' }}>{format(new Date(ci.date_received), 'MMM d, yyyy')}</p>
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
