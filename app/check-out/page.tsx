'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PROGRAMS, GIFT_CARD_PURPOSES, SHELTER_LOCATIONS_GC } from '@/lib/constants';
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
  item_type?: string;
  retailer?: string;
  face_value?: number;
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

  // Gift card specific fields
  const [familySize, setFamilySize] = useState<number>(1);
  const [shelterLocation, setShelterLocation] = useState('');
  const [giftCardPurpose, setGiftCardPurpose] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    item: InventoryItem;
    clientFirstName: string;
    clientLastName: string;
    quantity: number;
    dateGiven: string;
    caseManagerName: string;
    familySize?: number;
    shelterLocation?: string;
    giftCardPurpose?: string;
  } | null>(null);

  const isGiftCard = selectedItem?.item_type === 'gift_card';

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
        familySize: isGiftCard ? familySize : undefined,
        shelterLocation: isGiftCard ? shelterLocation : undefined,
        giftCardPurpose: isGiftCard ? giftCardPurpose : undefined,
      });
      const caseManagerName = profiles.find(p => p.id === caseManagerId)?.full_name ?? '';
      setSubmittedData({
        item: selectedItem,
        clientFirstName: clientFirstName.trim(),
        clientLastName: clientLastName.trim(),
        quantity,
        dateGiven,
        caseManagerName,
        familySize: isGiftCard ? familySize : undefined,
        shelterLocation: isGiftCard ? shelterLocation : undefined,
        giftCardPurpose: isGiftCard ? giftCardPurpose : undefined,
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
    setFamilySize(1);
    setShelterLocation('');
    setGiftCardPurpose('');
    setSuccess(false);
    setSubmittedData(null);
  }

  async function handlePrintReceipt() {
    if (!submittedData) return;
    const { default: jsPDF } = await import('jspdf');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    const pageW = 612;
    const margin = 40;
    const contentW = pageW - margin * 2;

    // Header bar
    doc.setFillColor(0, 99, 190); // FPGWC blue
    doc.rect(0, 0, pageW, 60, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Family Promise of Greater Washington County', pageW / 2, 24, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Client Gift Card Receipt', pageW / 2, 44, { align: 'center' });

    // Reset text color
    doc.setTextColor(30, 30, 30);

    let y = 80;

    // Date line
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${format(new Date(submittedData.dateGiven + 'T12:00:00'), 'MMMM d, yyyy')}`, margin, y);
    y += 20;

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 16;

    // Section: Client Information
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 99, 190);
    doc.text('CLIENT INFORMATION', margin, y);
    y += 14;
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    function labelValue(label: string, value: string, xOffset = 0) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, margin + xOffset, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + xOffset + 90, y);
      y += 16;
    }

    labelValue('Client Name', `${submittedData.clientFirstName} ${submittedData.clientLastName}`);
    if (submittedData.shelterLocation) labelValue('Shelter Location', submittedData.shelterLocation);
    if (submittedData.familySize) labelValue('Family Size', `${submittedData.familySize} person${submittedData.familySize !== 1 ? 's' : ''}`);
    labelValue('Program', submittedData.item.category || 'Gift Cards');

    y += 6;
    doc.line(margin, y, pageW - margin, y);
    y += 16;

    // Section: Gift Card Details
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 99, 190);
    doc.text('GIFT CARD DETAILS', margin, y);
    y += 14;
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const retailer = submittedData.item.retailer ?? 'Gift Card';
    const faceValue = submittedData.item.face_value ?? 0;
    const qty = submittedData.quantity;
    const totalValue = faceValue * qty;

    labelValue('Retailer / Store', retailer);
    labelValue('Face Value per Card', `$${faceValue.toFixed(2)}`);
    labelValue('Number of Cards', `${qty}`);

    // Total value highlight box
    doc.setFillColor(240, 247, 255);
    doc.setDrawColor(0, 99, 190);
    doc.roundedRect(margin, y, contentW, 28, 4, 4, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 99, 190);
    doc.text(`Total Value Given: $${totalValue.toFixed(2)}`, pageW / 2, y + 18, { align: 'center' });
    y += 40;
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    if (submittedData.giftCardPurpose) {
      labelValue('Purpose', submittedData.giftCardPurpose);
    }

    y += 6;
    doc.line(margin, y, pageW - margin, y);
    y += 16;

    // Section: Staff Information
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 99, 190);
    doc.text('STAFF INFORMATION', margin, y);
    y += 14;
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    labelValue('Staff / Case Manager', submittedData.caseManagerName);

    y += 20;

    // Signature lines
    const sigY = y;
    // Client signature
    doc.setDrawColor(80, 80, 80);
    doc.line(margin, sigY + 30, margin + 200, sigY + 30);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Client Signature', margin, sigY + 42);
    doc.text('Date', margin + 160, sigY + 42);

    // Staff signature
    const sig2X = margin + 260;
    doc.line(sig2X, sigY + 30, sig2X + 200, sigY + 30);
    doc.text('Staff Signature', sig2X, sigY + 42);
    doc.text('Date', sig2X + 160, sigY + 42);

    y = sigY + 60;

    // Footer
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 792 - 40, pageW, 40, 'F');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'Family Promise of Greater Washington County  ·  This receipt confirms the distribution of gift card(s) to the above-named client.',
      pageW / 2,
      792 - 24,
      { align: 'center' }
    );
    doc.text('Please retain a copy for your records.', pageW / 2, 792 - 12, { align: 'center' });

    const filename = `GiftCard_Receipt_${submittedData.clientLastName}_${format(new Date(submittedData.dateGiven + 'T12:00:00'), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  }

  if (success && submittedData) {
    const isGC = submittedData.item.item_type === 'gift_card';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center max-w-sm w-full">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: isGC ? '#f3e8ff' : '#fff3e0' }}>
            <span className="text-3xl">{isGC ? '🎁' : '📤'}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check-Out Complete</h2>
          {isGC ? (
            <>
              <p className="text-gray-500 text-sm mb-1">
                {submittedData.quantity}x <strong>{submittedData.item.retailer}</strong> gift card{submittedData.quantity !== 1 ? 's' : ''}
              </p>
              <p className="text-purple-700 font-semibold text-sm mb-1">
                Total: ${((submittedData.item.face_value ?? 0) * submittedData.quantity).toFixed(2)}
              </p>
            </>
          ) : (
            <p className="text-gray-500 text-sm mb-1">
              {submittedData.quantity}x <strong>{submittedData.item.description}</strong>
            </p>
          )}
          <p className="text-gray-500 text-sm mb-6">
            given to <strong>{submittedData.clientFirstName} {submittedData.clientLastName}</strong>
          </p>
          <div className="space-y-3">
            {isGC && (
              <button
                onClick={handlePrintReceipt}
                className="w-full text-white py-3 rounded-xl font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#0063be' }}
              >
                🖨️ Print Client Receipt
              </button>
            )}
            <button
              onClick={resetForm}
              className="w-full text-white py-3 rounded-xl font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#f6a03b' }}
            >
              New Check-Out
            </button>
          </div>
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
                  placeholder="e.g., blanket, dishes, hygiene, gift card…"
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
                          <p className="font-medium text-gray-900 text-sm">
                            {item.item_type === 'gift_card' ? '🎁 ' : ''}{item.description}
                          </p>
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
            <div className={`border rounded-xl p-4 flex items-start justify-between ${isGiftCard ? 'bg-purple-50 border-purple-200' : 'bg-orange-50 border-orange-200'}`}>
              <div>
                <p className={`font-semibold ${isGiftCard ? 'text-purple-900' : 'text-orange-900'}`}>
                  {isGiftCard ? '🎁 ' : ''}{selectedItem.description}
                </p>
                {isGiftCard && selectedItem.face_value && (
                  <p className="text-sm text-purple-700">${selectedItem.face_value.toFixed(2)} per card</p>
                )}
                <p className={`text-xs mt-0.5 ${isGiftCard ? 'text-purple-600' : 'text-orange-600'}`}>{selectedItem.storage_location}</p>
                <p className={`text-sm font-medium mt-1 ${isGiftCard ? 'text-purple-800' : 'text-orange-800'}`}>
                  {selectedItem.current_quantity} available
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className={`ml-3 text-sm ${isGiftCard ? 'text-purple-500 hover:text-red-500' : 'text-orange-500 hover:text-red-500'}`}
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

          {/* Gift card specific fields */}
          {isGiftCard && (
            <>
              <div className="h-px bg-purple-100" />
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Gift Card Details</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Cards <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedItem?.current_quantity ?? 999}
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 text-base"
                  />
                  {selectedItem && quantity > selectedItem.current_quantity && (
                    <p className="text-xs text-red-500 mt-1">Exceeds available quantity</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Family Size <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={familySize}
                    onChange={e => setFamilySize(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 text-base"
                  />
                </div>
              </div>

              {selectedItem?.face_value && quantity > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-900 text-center">
                  <span className="font-semibold">Total Value: ${(selectedItem.face_value * quantity).toFixed(2)}</span>
                  <span className="text-purple-600 ml-2">({quantity} × ${selectedItem.face_value.toFixed(2)})</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shelter Location <span className="text-red-500">*</span></label>
                <select
                  required
                  value={shelterLocation}
                  onChange={e => setShelterLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 text-base bg-white"
                >
                  <option value="">Select location…</option>
                  {SHELTER_LOCATIONS_GC.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose <span className="text-red-500">*</span></label>
                <select
                  required
                  value={giftCardPurpose}
                  onChange={e => setGiftCardPurpose(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 text-base bg-white"
                >
                  <option value="">Select purpose…</option>
                  {GIFT_CARD_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Standard item quantity + date */}
          {!isGiftCard && (
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
          )}

          {/* Date given for gift cards (full width) */}
          {isGiftCard && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Given</label>
              <input
                type="date"
                value={dateGiven}
                onChange={e => setDateGiven(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 text-base"
              />
            </div>
          )}
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
            (selectedItem ? quantity > selectedItem.current_quantity : false) ||
            (isGiftCard && (!shelterLocation || !giftCardPurpose))
          }
          className="w-full text-white py-3.5 rounded-xl font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
          style={{ backgroundColor: isGiftCard ? '#7c3aed' : '#f6a03b' }}
        >
          {loading ? 'Recording…' : isGiftCard ? '🎁 Record Gift Card Check-Out' : '📤 Record Check-Out'}
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
