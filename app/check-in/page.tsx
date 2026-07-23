'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ITEM_CATEGORIES, STORAGE_LOCATIONS, GIFT_CARD_STORAGE_LOCATIONS, CONDITIONS, CHECK_IN_PROGRAMS, GIFT_CARD_PURPOSES } from '@/lib/constants';
import { estimateFMV } from '@/lib/fmv';
import { submitCheckIn } from '@/app/actions/checkIn';
import FMVGuidePanel from '@/components/FMVGuidePanel';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { format } from 'date-fns';

type Donor = {
  id: string;
  name: string;
  organization: string | null;
  email: string | null;
  phone: string | null;
  bloomerang_contact_id: string | null;
};

type Step = 1 | 2 | 3;

function CheckInForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Step 1 – Donor
  const [donorSearch, setDonorSearch] = useState('');
  const [donorResults, setDonorResults] = useState<Donor[]>([]);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [isNewDonor, setIsNewDonor] = useState(false);
  const [newDonorName, setNewDonorName] = useState('');
  const [newDonorOrg, setNewDonorOrg] = useState('');
  const [newDonorEmail, setNewDonorEmail] = useState('');
  const [newDonorPhone, setNewDonorPhone] = useState('');

  // Step 2 – Item
  // Item type toggle
  const [itemType, setItemType] = useState<'standard' | 'gift_card'>('standard');

  // Gift card fields
  const [retailer, setRetailer] = useState('');
  const [faceValue, setFaceValue] = useState<number>(0);
  const [gcPurpose, setGcPurpose] = useState('');

  const [program, setProgram] = useState('General');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionResults, setDescriptionResults] = useState<{id: string; description: string; category: string; storage_location: string}[]>([]);
  const [existingItemId, setExistingItemId] = useState<string | null>(null);
  const [storageLocation, setStorageLocation] = useState('');
  const [condition, setCondition] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [fmvPerUnit, setFmvPerUnit] = useState(0);
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [dateReceived, setDateReceived] = useState(format(new Date(), 'yyyy-MM-dd'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // FMV guide panel
  const [fmvGuideOpen, setFmvGuideOpen] = useState(false);

  // Success
  const [successItemId, setSuccessItemId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [successDescription, setSuccessDescription] = useState('');

  // Donor search
  // Pre-load item if coming from QR code scan (?item=UUID)
  useEffect(() => {
    const itemId = searchParams.get('item');
    if (!itemId) return;
    supabase.from('inventory_items').select('*').eq('id', itemId).single().then(({ data }) => {
      if (!data) return;
      setDescription(data.description);
      setCategory(data.category);
      setStorageLocation(data.storage_location);
      setExistingItemId(data.id);
      if (data.item_type === 'gift_card') {
        setItemType('gift_card');
        setRetailer(data.retailer ?? '');
        setFaceValue(data.face_value ?? 0);
      }
    });
  }, []);

  useEffect(() => {
    if (donorSearch.length < 2) { setDonorResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('donors')
        .select('*')
        .ilike('name', `%${donorSearch}%`)
        .limit(8);
      setDonorResults(data ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [donorSearch]);

  // Auto-calculate FMV when category/condition changes
  useEffect(() => {
    if (category && condition) {
      setFmvPerUnit(estimateFMV(category, condition));
    }
  }, [category, condition]);

  // Description autocomplete — search existing items
  useEffect(() => {
    if (description.length < 2 || existingItemId) { setDescriptionResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('inventory_items')
        .select('id, description, category, storage_location')
        .ilike('description', `%${description}%`)
        .order('description')
        .limit(6);
      setDescriptionResults(data ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [description, existingItemId]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function saveDonorIfNew(): Promise<Donor> {
    if (selectedDonor) return selectedDonor;
    // Create new donor
    const { data, error } = await supabase
      .from('donors')
      .insert({
        name: newDonorName.trim(),
        organization: newDonorOrg.trim() || null,
        email: newDonorEmail.trim() || null,
        phone: newDonorPhone.trim() || null,
      })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to create donor');
    return data as Donor;
  }

  async function uploadPhoto(): Promise<string | undefined> {
    if (!photoFile) return undefined;
    const ext = photoFile.name.split('.').pop();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from('item-photos')
      .upload(filename, photoFile, { contentType: photoFile.type });
    if (error) { toast.error('Photo upload failed — continuing without photo'); return undefined; }
    const { data } = supabase.storage.from('item-photos').getPublicUrl(filename);
    return data.publicUrl;
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const donor = await saveDonorIfNew();
      const photoUrl = await uploadPhoto();

      const isGiftCard = itemType === 'gift_card';
      const gcDescription = retailer && faceValue
        ? `${retailer} $${faceValue.toFixed(2)} Gift Card`
        : `${retailer || 'Gift'} Card`;

      const result = await submitCheckIn({
        donorId: donor.id,
        donorBloomerangId: donor.bloomerang_contact_id ?? undefined,
        program,
        category: isGiftCard ? 'Gift Cards' : category,
        description: isGiftCard ? gcDescription : description.trim(),
        storageLocation,
        condition: isGiftCard ? 'New' : condition,
        quantity,
        fmvPerUnit: isGiftCard ? faceValue : fmvPerUnit,
        photoUrl,
        notes: isGiftCard
          ? (gcPurpose ? `Purpose: ${gcPurpose}${notes.trim() ? ` | ${notes.trim()}` : ''}` : notes.trim() || undefined)
          : notes.trim() || undefined,
        dateReceived,
        itemType,
        retailer: isGiftCard ? retailer : undefined,
        faceValue: isGiftCard ? faceValue : undefined,
      });

      // Generate QR code with full checkout URL
      const checkoutUrl = `${window.location.origin}/check-out?item=${result.itemId}`;
      const qr = await QRCode.toDataURL(checkoutUrl, { width: 256, margin: 2 });
      setQrDataUrl(qr);
      setSuccessItemId(result.itemId);
      setSuccessDescription(description.trim());
      setStep(3);
      toast.success('Check-in recorded!');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setStep(1);
    setDonorSearch('');
    setDonorResults([]);
    setSelectedDonor(null);
    setIsNewDonor(false);
    setNewDonorName(''); setNewDonorOrg(''); setNewDonorEmail(''); setNewDonorPhone('');
    setItemType('standard'); setRetailer(''); setFaceValue(0); setGcPurpose('');
    setProgram('General'); setCategory(''); setDescription(''); setStorageLocation(''); setCondition('');
    setQuantity(''); setFmvPerUnit(0); setNotes('');
    setPhotoFile(null); setPhotoPreview(null);
    setDateReceived(format(new Date(), 'yyyy-MM-dd'));
    setSuccessItemId(null); setQrDataUrl(null);
    setDescriptionResults([]); setExistingItemId(null);
  }

  const canProceedStep1 = selectedDonor || (isNewDonor && newDonorName.trim().length > 0);
  const canProceedStep2 = itemType === 'gift_card'
    ? retailer.trim() && faceValue > 0 && storageLocation && quantity > 0
    : category && description.trim() && storageLocation && condition && quantity > 0 && fmvPerUnit >= 0;

  const donorDisplay = selectedDonor?.name ?? newDonorName;

  // ── SUCCESS SCREEN ─────────────────────────────────────
  if (step === 3 && successItemId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center no-print">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Check-In Complete</h2>
            <p className="text-gray-500 text-sm mb-5">{successDescription}</p>

            {qrDataUrl && (
              <div className="mb-5">
                <img src={qrDataUrl} alt="QR code" className="mx-auto w-48 h-48" />
                <p className="text-xs text-gray-400 mt-2">📱 Scan to go directly to checkout</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                🖨️ Print Label
              </button>
              <button
                onClick={resetForm}
                className="flex-1 bg-green-700 text-white py-2.5 rounded-xl font-medium hover:bg-green-800 transition-colors"
              >
                New Check-In
              </button>
            </div>
          </div>

          {/* Print-only label */}
          {qrDataUrl && (
            <div className="print-only text-center p-4">
              <p className="font-bold text-lg mb-1">Family Promise of Greater Washington County</p>
              <p className="text-base mb-2">{successDescription}</p>
              <img src={qrDataUrl} alt="QR code" className="mx-auto w-40 h-40" />
              <p className="text-xs mt-1 font-mono break-all">{successItemId}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 pb-28 md:pb-10 max-w-lg mx-auto" style={{ background: '#f8f7fb' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold" style={{ color: '#3a1f4a' }}>Check In Donation</h1>
        <p className="text-sm mt-1" style={{ color: '#8a7f92' }}>Record an in-kind donation or gift card</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold transition-colors"
              style={step === s
                ? { background: 'linear-gradient(135deg,#f5a623,#8b4a72)', color: '#fff' }
                : step > s
                ? { background: '#e6e0ee', color: '#8b4a72' }
                : { background: '#e6e0ee', color: '#9a8fa0' }}
            >
              {step > s ? '✓' : s}
            </div>
            <span className="text-sm hidden md:inline font-semibold" style={{ color: step === s ? '#8b4a72' : '#9a8fa0' }}>
              {s === 1 ? 'Donor' : 'Item Details'}
            </span>
            {s < 2 && <div className="flex-1 mx-2" style={{ height: 3, borderRadius: 2, background: '#e6e0ee', minWidth: 32 }} />}
          </div>
        ))}
      </div>

      {/* Step 1 – Donor */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 10px 30px -18px rgba(58,31,74,.3)', border: '1px solid rgba(58,31,74,.05)' }}>
            <h2 className="font-extrabold text-lg mb-4" style={{ color: '#3a1f4a' }}>Who is donating?</h2>

            {!isNewDonor && !selectedDonor && (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: '#4d4457' }}>Search donor by name</label>
                  <input
                    type="text"
                    value={donorSearch}
                    onChange={e => setDonorSearch(e.target.value)}
                    placeholder="Start typing a name…"
                    className="w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-300"
                    style={{ border: '1.5px solid #e3ddec', background: '#fbfafd', color: '#3a1f4a' }}
                  />
                </div>
                {donorResults.length > 0 && (
                  <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1.5px solid #e3ddec' }}>
                    {donorResults.map(d => (
                      <button
                        key={d.id}
                        onClick={() => { setSelectedDonor(d); setDonorSearch(''); setDonorResults([]); }}
                        className="w-full text-left px-4 py-3 border-b last:border-0 transition-colors"
                        style={{ borderColor: '#f2ede6' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f7f4fb')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        <p className="font-semibold text-sm" style={{ color: '#2a2333' }}>{d.name}</p>
                        {d.organization && <p className="text-xs" style={{ color: '#9a8fa0' }}>{d.organization}</p>}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setIsNewDonor(true)}
                  className="mt-4 w-full py-3 rounded-xl text-sm font-bold transition-colors"
                  style={{ border: '2px dashed #d6cee0', color: '#8b4a72' }}
                >
                  + Add new donor
                </button>
              </>
            )}

            {selectedDonor && (
              <div className="rounded-xl p-4 flex items-start justify-between" style={{ background: '#f3e6f5', border: '1px solid #d6cee0' }}>
                <div>
                  <p className="font-semibold" style={{ color: '#3a1f4a' }}>{selectedDonor.name}</p>
                  {selectedDonor.organization && <p className="text-sm" style={{ color: '#8b4a72' }}>{selectedDonor.organization}</p>}
                  {selectedDonor.email && <p className="text-xs" style={{ color: '#9a8fa0' }}>{selectedDonor.email}</p>}
                </div>
                <button onClick={() => setSelectedDonor(null)} className="text-sm ml-3" style={{ color: '#8b4a72' }}>✕</button>
              </div>
            )}

            {isNewDonor && !selectedDonor && (
              <div className="space-y-3">
                {[
                  { label: 'Full Name', key: 'name', value: newDonorName, onChange: setNewDonorName, placeholder: 'Jane Smith', required: true, type: 'text' },
                  { label: 'Organization (optional)', key: 'org', value: newDonorOrg, onChange: setNewDonorOrg, placeholder: 'Company or church name', required: false, type: 'text' },
                  { label: 'Email (optional)', key: 'email', value: newDonorEmail, onChange: setNewDonorEmail, placeholder: 'jane@example.com', required: false, type: 'email' },
                  { label: 'Phone (optional)', key: 'phone', value: newDonorPhone, onChange: setNewDonorPhone, placeholder: '(503) 555-0100', required: false, type: 'tel' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: '#4d4457' }}>
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={f.type}
                      value={f.value}
                      onChange={e => f.onChange(e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-300"
                      style={{ border: '1.5px solid #e3ddec', background: '#fbfafd', color: '#3a1f4a' }}
                    />
                  </div>
                ))}
                <button
                  onClick={() => setIsNewDonor(false)}
                  className="text-sm font-semibold underline"
                  style={{ color: '#8b4a72' }}
                >
                  ← Back to search
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!canProceedStep1}
            className="w-full text-white py-4 rounded-xl font-extrabold text-base disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(120deg,#f5a623,#d1618a 55%,#7c3a9e)', boxShadow: '0 14px 30px -14px rgba(124,58,158,.7)' }}
          >
            Next: Item Details →
          </button>
        </div>
      )}

      {/* Step 2 – Item Details */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 10px 30px -18px rgba(58,31,74,.3)', border: '1px solid rgba(58,31,74,.05)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#f3e6f5', color: '#8b4a72' }}>Donor</span>
              <span className="text-sm font-semibold" style={{ color: '#4d4457' }}>{donorDisplay}</span>
            </div>
            <h2 className="font-extrabold text-lg mt-3 mb-4" style={{ color: '#3a1f4a' }}>Item Details</h2>

            <div className="space-y-4">

              {/* Item Type Toggle */}
              <div className="flex rounded-xl overflow-hidden border border-gray-300">
                <button
                  type="button"
                  onClick={() => setItemType('standard')}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${itemType === 'standard' ? 'text-white' : 'text-gray-600 bg-white hover:bg-gray-50'}`}
                  style={itemType === 'standard' ? { backgroundColor: '#0063be' } : {}}
                >
                  📦 Standard Donation
                </button>
                <button
                  type="button"
                  onClick={() => setItemType('gift_card')}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${itemType === 'gift_card' ? 'text-white' : 'text-gray-600 bg-white hover:bg-gray-50'}`}
                  style={itemType === 'gift_card' ? { backgroundColor: '#8d4982' } : {}}
                >
                  🎁 Gift Card
                </button>
              </div>

              {/* Gift Card specific fields */}
              {itemType === 'gift_card' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Store / Retailer <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={retailer}
                      onChange={e => setRetailer(e.target.value)}
                      placeholder="e.g., Target, Safeway, Chevron…"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600 text-base"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Face Value per Card ($) <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={faceValue || ''}
                        onChange={e => setFaceValue(parseFloat(e.target.value) || 0)}
                        placeholder="e.g., 25.00"
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600 text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Number of Cards <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600 text-base"
                      />
                    </div>
                  </div>
                  {faceValue > 0 && quantity > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-900">
                      <span className="font-semibold">Total Value: ${(faceValue * quantity).toFixed(2)}</span>
                      <span className="text-purple-600 ml-2">({quantity} × ${faceValue.toFixed(2)})</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Intended Purpose</label>
                    <select
                      value={gcPurpose}
                      onChange={e => setGcPurpose(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600 text-base bg-white"
                    >
                      <option value="">Select purpose (optional)…</option>
                      {GIFT_CARD_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program <span className="text-red-500">*</span></label>
                <select
                  value={program}
                  onChange={e => setProgram(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-base bg-white"
                >
                  {CHECK_IN_PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Standard donation fields only */}
              {itemType === 'standard' && (<>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-base bg-white"
                >
                  <option value="">Select category…</option>
                  {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                {existingItemId ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-900 text-sm">{description}</p>
                      <p className="text-xs text-green-600">Adding to existing stock — same QR code</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setExistingItemId(null); setDescription(''); setCategory(''); setStorageLocation(''); }}
                      className="text-green-600 hover:text-red-500 text-sm ml-3"
                    >✕</button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={description}
                      onChange={e => { setDescription(e.target.value); setExistingItemId(null); }}
                      placeholder="e.g., Toilet Paper, Shampoo, Blanket…"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-base"
                    />
                    {descriptionResults.length > 0 && (
                      <div className="mt-1 border border-green-200 rounded-xl overflow-hidden shadow-sm bg-white z-10 relative">
                        <p className="text-xs text-green-700 font-medium px-3 py-2 bg-green-50 border-b border-green-100">
                          ✓ Existing items — tap to add to current stock
                        </p>
                        {descriptionResults.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setDescription(item.description);
                              setCategory(item.category);
                              setStorageLocation(item.storage_location);
                              setExistingItemId(item.id);
                              setDescriptionResults([]);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-green-50 border-b border-gray-100 last:border-0 transition-colors"
                          >
                            <p className="font-medium text-gray-900 text-sm">{item.description}</p>
                            <p className="text-xs text-gray-500">{item.category} · {item.storage_location}</p>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setDescriptionResults([])}
                          className="w-full text-left px-4 py-2.5 text-xs text-gray-400 hover:bg-gray-50 border-t border-gray-100"
                        >
                          + Create new item instead
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location <span className="text-red-500">*</span></label>
                <select
                  value={storageLocation}
                  onChange={e => setStorageLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-base bg-white"
                >
                  <option value="">Select location…</option>
                  {STORAGE_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition <span className="text-red-500">*</span></label>
                  <select
                    value={condition}
                    onChange={e => setCondition(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-sm bg-white"
                  >
                    <option value="">Select…</option>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-base"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    FMV Per Unit ($)
                    <span className="text-xs text-gray-400 font-normal ml-2">auto-estimated — editable</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFmvGuideOpen(true)}
                    className="flex items-center gap-1 text-xs text-green-700 font-medium bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <span>📋</span> Value Guide
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fmvPerUnit}
                  onChange={e => setFmvPerUnit(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-base"
                />
                {fmvPerUnit > 0 && quantity > 1 && (
                  <p className="text-xs text-green-700 mt-1">
                    Total FMV: ${(fmvPerUnit * quantity).toFixed(2)}
                  </p>
                )}
              </div>
              </>)} {/* end standard-only fields */}

              {/* Storage Location — shown for all item types */}
              {itemType === 'gift_card' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location <span className="text-red-500">*</span></label>
                  <select
                    value={storageLocation}
                    onChange={e => setStorageLocation(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600 text-base bg-white"
                  >
                    <option value="">Select location…</option>
                    {GIFT_CARD_STORAGE_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Received</label>
                <input
                  type="date"
                  value={dateReceived}
                  onChange={e => setDateReceived(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-base"
                />
              </div>

              {/* Photo upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="mx-auto max-h-32 rounded-lg object-cover" />
                  ) : (
                    <>
                      <span className="text-2xl">📷</span>
                      <p className="text-sm text-gray-500 mt-1">Tap to add a photo</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                {photoPreview && (
                  <button
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="text-xs text-red-500 hover:text-red-700 mt-1"
                  >
                    Remove photo
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any additional details…"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-base resize-none"
                />
              </div>
            </div>
          </div>

          {/* Review summary */}
          {canProceedStep2 && (
            <div className={`border rounded-2xl p-4 text-sm ${itemType === 'gift_card' ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200'}`}>
              <p className={`font-semibold mb-2 ${itemType === 'gift_card' ? 'text-purple-900' : 'text-green-900'}`}>Summary</p>
              <div className={`space-y-1 ${itemType === 'gift_card' ? 'text-purple-800' : 'text-green-800'}`}>
                <p><span className="font-medium">Donor:</span> {donorDisplay}</p>
                <p><span className="font-medium">Program:</span> {program}</p>
                {itemType === 'gift_card' ? (
                  <>
                    <p><span className="font-medium">Type:</span> 🎁 Gift Card</p>
                    <p><span className="font-medium">Retailer:</span> {retailer}</p>
                    <p><span className="font-medium">Cards:</span> {quantity} × ${faceValue?.toFixed(2)} = <strong>${((faceValue ?? 0) * quantity).toFixed(2)}</strong></p>
                    {gcPurpose && <p><span className="font-medium">Purpose:</span> {gcPurpose}</p>}
                  </>
                ) : (
                  <>
                    <p><span className="font-medium">Item:</span> {description}</p>
                    <p><span className="font-medium">Category:</span> {category}</p>
                    <p><span className="font-medium">Condition:</span> {condition}</p>
                    <p><span className="font-medium">Qty:</span> {quantity} &nbsp;|&nbsp; <span className="font-medium">FMV:</span> ${(fmvPerUnit * quantity).toFixed(2)}</p>
                  </>
                )}
                <p><span className="font-medium">Location:</span> {storageLocation}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 border border-gray-300 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canProceedStep2 || loading}
              className="flex-[2] bg-green-700 text-white py-3.5 rounded-xl font-semibold text-base hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving…' : '✅ Submit Check-In'}
            </button>
          </div>
        </div>
      )}

      {/* FMV Value Guide Panel */}
      <FMVGuidePanel
        open={fmvGuideOpen}
        onClose={() => setFmvGuideOpen(false)}
        activeCategory={category}
      />
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Loading…</p></div>}>
      <CheckInForm />
    </Suspense>
  );
}
