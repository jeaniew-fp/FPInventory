'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PROGRAMS } from '@/lib/constants';
import { submitCheckOut } from '@/app/actions/checkOut';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';

const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false });

type InventoryItem = {
  id: string;
  description: string;
  category: string;
  storage_location: string;
  current_quantity: number;
};

type Profile = {
  id: string;
  full_name: string;
  role: string;
};

function CheckOutForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [itemSearch, setItemSearch] = useState('');
  const [itemResults, setItemResults] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clientFirstName, setClientFirstName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [hmisNumber, setHmisNumber] = useState('');
  const [caseManagerId, setCaseManagerId] = useState('');
  const [program, setProgram] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [dateGiven, setDateGiven] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, role').then(({ data }) => {
      if (data) setProfiles(data);
    });
  }, []);

  // Auto-select item if ?item=UUID is in the URL (from QR code scan)
  useEffect(() => {
    const itemId = searchParams.get('item');
    if (itemId) {
      loadItemById(itemId);
    }
  }, [searchParams]);

  async function loadItemById(itemId: string) {
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .single();
    if (data) {
      setSelectedItem(data);
      setQuantity(1);
      setItemSearch('');
      setItemResults([]);
    } else {
      toast.error('Item not found. Please search manually.');
    }
  }

  // Item search
  useEffect(() => {
    if (itemSearch.length < 2) { setItemResults([]); return; }
    const timer = setTimeout(async () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(itemSearch.trim())) {
        const { data } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('id', itemSearch.trim())
          .single();
        setItemResults(data ? [data] : []);
      } else {
        const { data } = await supabase
          .from('inventory_items')
          .select('*')
          .or(`description.ilike.%${itemSearch}%,category.ilike.%${itemSearch}%`)
          .gt('current_quantity', 0)
          .order('description')
          .limit(10);
        setItemResults(data ?? []);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [itemSearch]);

  function handleQRScan(itemId: string) {
    setShowScanner(false);
    loadItemById(itemId);
    toast.success('Item scanned!');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) { toast.error('Please select an item'); return; }
    setLoading(true);
    try {
      await submitCheckOut({
        inventoryItemId: selectedItem.id,
        clientFirstName: clientFirstName.trim(),
        clientLastName: clientLastName.trim(),
        hmisNumber: hmisNumber.trim() || undefined,
        caseManagerId,
        program,
        quantity,
        dateGiven,
      });
      setSuccess(true);
      toast.success('Check-out recorded!');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setItemSearch('');
    setItemResults([]);
    setSelectedItem(null);
    setClientFirstName('');
    setClientLastName('');
    setHmisNumber('');
    setCaseManagerId('');
    setProgram('');
    setQuantity(1);
    setDateGiven(format(new Date(), 'yyyy-MM-dd'));
    setSuccess(false);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center max-w-sm w-full">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#fff3e0' }}>
            <span className="text-3xl">📤</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check-Out Complete</h2>
          <p className="text-gray-500 text-sm mb-2">
            {quantity}x <strong>{selectedItem?.description}</strong>
          </p>
          <p className="text-gray-500 text-sm mb-6">
            given to <strong>{clientFirstName} {clientLastName}</strong>
          </p>
          <button
            onClick={resetForm}
            className="w-full text-white py-3 rounded-xl font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#f6a03b' }}
          >
            New Check-Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 pb-28 md:pb-10 max-w-lg mx-auto">
      {showScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Check Out Item</h1>
        <p className="text-gray-500 text-sm mt-1">Give an item to a client</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Item selection */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Select Item</h2>

          {!selectedItem ? (
            <>
              {/* Scan button */}
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="w-full text-white py-3.5 rounded-xl font-semibold text-base mb-4 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#0063be' }}
              >
                📷 Scan QR Code
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or search manually</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search by item name or category
                </label>
                <input
                  type="text"
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  placeholder="e.g., blanket, dishes, hygiene…"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 text-base"
                  style={{ '--tw-ring-color': '#f6a03b' } as React.CSSProperties}
                />
              </div>
              {itemResults.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
                  {itemResults.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedItem(item);
                        setQuantity(1);
                        setItemSearch('');
                        setItemResults([]);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b border-gray-100 last:border-0 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{item.description}</p>
                          <p className="text-xs text-gray-500">{item.category} · {item.storage_location}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ml-2 ${
                          item.current_quantity > 5
                            ? 'bg-green-100 text-green-700'
                            : item.current_quantity > 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {item.current_quantity} avail.
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {itemSearch.length >= 2 && itemResults.length === 0 && (
                <p className="text-sm text-gray-400 mt-2">No items found. Try a different search term.</p>
              )}
            </>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start justify-between">
              <div>
                <p className="font-semibold text-orange-900">{selectedItem.description}</p>
                <p className="text-sm text-orange-700">{selectedItem.category}</p>
                <p className="text-xs text-orange-600">{selectedItem.storage_location}</p>
                <p className="text-sm font-medium text-orange-800 mt-1">
                  {selectedItem.current_quantity} available
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-orange-500 hover:text-red-500 ml-3 text-sm"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Client info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900">Client Information</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={clientFirstName}
                onChange={e => setClientFirstName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={clientLastName}
                onChange={e => setClientLastName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 text-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">HMIS Number (optional)</label>
            <input
              type="text"
              value={hmisNumber}
              onChange={e => setHmisNumber(e.target.value)}
              placeholder="e.g., 12345"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Case Manager <span className="text-red-500">*</span></label>
            <select
              required
              value={caseManagerId}
              onChange={e => setCaseManagerId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 text-base bg-white"
            >
              <option value="">Select case manager…</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Program <span className="text-red-500">*</span></label>
            <select
              required
              value={program}
              onChange={e => setProgram(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 text-base bg-white"
            >
              <option value="">Select program…</option>
              {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
              <input
                type="number"
                required
                min="1"
                max={selectedItem?.current_quantity ?? 999}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 text-base"
              />
              {selectedItem && quantity > selectedItem.current_quantity && (
                <p className="text-xs text-red-500 mt-1">Exceeds available quantity</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Given</label>
              <input
                type="date"
                value={dateGiven}
                onChange={e => setDateGiven(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 text-base"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={
            loading ||
            !selectedItem ||
            !clientFirstName.trim() ||
            !clientLastName.trim() ||
            !caseManagerId ||
            !program ||
            quantity < 1 ||
            (selectedItem ? quantity > selectedItem.current_quantity : false)
          }
          className="w-full text-white py-3.5 rounded-xl font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#f6a03b' }}
        >
          {loading ? 'Recording…' : '📤 Record Check-Out'}
        </button>
      </form>
    </div>
  );
}

export default function CheckOutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Loading…</p></div>}>
      <CheckOutForm />
    </Suspense>
  );
}
