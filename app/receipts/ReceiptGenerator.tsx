'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { sendReceiptEmail } from '@/app/actions/receipt';

type CheckInRow = {
  id: string;
  date_received: string;
  quantity: number;
  fmv_per_unit: number;
  total_fmv: number;
  condition: string;
  inventory_items: {
    description: string;
    category: string;
    program: string;
  };
  donors: {
    id: string;
    name: string;
    organization: string | null;
    email: string | null;
    phone: string | null;
  };
};

type DonorResult = {
  id: string;
  name: string;
  organization: string | null;
  email: string | null;
  phone: string | null;
};

export default function ReceiptGenerator({
  staffName,
  staffEmail,
}: {
  staffName: string;
  staffEmail: string;
}) {
  const supabase = createClient();

  // Donor search
  const [donorSearch, setDonorSearch] = useState('');
  const [donorResults, setDonorResults] = useState<DonorResult[]>([]);
  const [selectedDonor, setSelectedDonor] = useState<DonorResult | null>(null);

  // Date filter
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Check-ins
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingCheckIns, setLoadingCheckIns] = useState(false);

  // Email
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailTo, setEmailTo] = useState('');

  // Donor search autocomplete
  useEffect(() => {
    if (donorSearch.length < 2) { setDonorResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('donors')
        .select('id, name, organization, email, phone')
        .ilike('name', `%${donorSearch}%`)
        .limit(8);
      setDonorResults(data ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [donorSearch]);

  // Set email when donor selected
  useEffect(() => {
    if (selectedDonor?.email) setEmailTo(selectedDonor.email);
  }, [selectedDonor]);

  async function searchCheckIns() {
    if (!selectedDonor) { toast.error('Please select a donor first'); return; }
    setLoadingCheckIns(true);
    setSelectedIds(new Set());
    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select(`
          id,
          date_received,
          quantity,
          fmv_per_unit,
          total_fmv,
          condition,
          inventory_items ( description, category, program ),
          donors ( id, name, organization, email, phone )
        `)
        .eq('donor_id', selectedDonor.id)
        .gte('date_received', dateFrom)
        .lte('date_received', dateTo)
        .order('date_received', { ascending: false });

      if (error) throw new Error(error.message);
      setCheckIns((data as unknown as CheckInRow[]) ?? []);
      if (!data?.length) toast('No donations found for this donor in that date range.', { icon: 'ℹ️' });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoadingCheckIns(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(checkIns.map(c => c.id)));
  }

  const selected = checkIns.filter(c => selectedIds.has(c.id));
  const totalFmv = selected.reduce((sum, c) => sum + (c.total_fmv ?? 0), 0);

  async function generatePDF(download = true) {
    if (!selected.length) { toast.error('Please select at least one donation'); return; }

    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;

    // ── Logo ──────────────────────────────────────────────
    try {
      const resp = await fetch('/fpgwc-logo.png');
      const blob = await resp.blob();
      const base64 = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(base64, 'PNG', pageW / 2 - 15, 10, 30, 30);
    } catch {}

    // ── Title ─────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 80);
    doc.text('FPGWC In-Kind Donation Receipt', margin, 52);

    // Date top-right
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const dateStr = format(new Date(dateFrom), 'MMMM d, yyyy');
    doc.text(dateStr, pageW - margin, 52, { align: 'right' });

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 56, pageW - margin, 56);

    // ── Donor Info ────────────────────────────────────────
    let y = 66;
    const labelX = margin;
    const valueX = 80;

    function infoRow(label: string, value: string) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 80);
      doc.text(label, labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(value || '—', valueX, y);
      y += 8;
    }

    infoRow('Date', format(new Date(dateFrom === dateTo ? dateFrom : selected[0]?.date_received ?? dateFrom), 'MMMM d, yyyy'));
    infoRow('Donor Name', selectedDonor?.name ?? '');
    infoRow('Donor Organization', selectedDonor?.organization ?? '');
    infoRow('Email', selectedDonor?.email ?? '');
    infoRow('Phone Number', selectedDonor?.phone ?? '');

    y += 4;

    // ── Items Table ───────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 80);
    doc.text('Donated Items', labelX, y);
    y += 4;

    const tableRows = selected.map((c, i) => [
      `Item #${i + 1}`,
      c.inventory_items?.description ?? '',
      c.quantity.toString(),
      `$${(c.total_fmv ?? 0).toFixed(2)}`,
    ]);

    // Total row
    tableRows.push([
      '',
      '',
      { content: 'TOTAL FMV', styles: { fontStyle: 'bold', halign: 'right' } } as any,
      { content: `$${totalFmv.toFixed(2)}`, styles: { fontStyle: 'bold' } } as any,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['', 'Item Description', 'Quantity', 'Total FMV ($)']],
      body: tableRows,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: [141, 73, 130],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: { fontSize: 9, textColor: [60, 60, 60] },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' },
      },
      alternateRowStyles: { fillColor: [250, 248, 255] },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // ── Program / Staff / Signature ───────────────────────
    const programs = [...new Set(selected.map(c => c.inventory_items?.program).filter(Boolean))];
    infoRow('Intended Use', programs.join(', ') || 'General');
    infoRow('Staff Name', staffName);

    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 80);
    doc.text('Signature', labelX, y);
    doc.setDrawColor(100, 100, 100);
    doc.line(valueX, y, valueX + 60, y);
    y += 16;

    // ── Footer ────────────────────────────────────────────
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY - 4, pageW - margin, footerY - 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      'Family Promise of Greater Washington County is a registered 501(c)(3) nonprofit organization. No goods or services were provided in exchange for this donation. | www.familypromisegwc.org',
      pageW / 2,
      footerY,
      { align: 'center', maxWidth: pageW - margin * 2 }
    );

    if (download) {
      const filename = `FPGWC-Receipt-${selectedDonor?.name.replace(/\s+/g, '-')}-${dateFrom}.pdf`;
      doc.save(filename);
    }

    return doc.output('datauristring');
  }

  async function handleEmail() {
    if (!selected.length) { toast.error('Please select at least one donation'); return; }
    if (!emailTo) { toast.error('Please enter an email address'); return; }

    setSendingEmail(true);
    try {
      const pdfDataUri = await generatePDF(false);
      if (!pdfDataUri) return;

      const base64 = pdfDataUri.split(',')[1];
      const donorName = selectedDonor?.name ?? 'Donor';
      const filename = `FPGWC-Receipt-${donorName.replace(/\s+/g, '-')}-${dateFrom}.pdf`;

      const result = await sendReceiptEmail({
        to: emailTo,
        staffEmail,
        donorName,
        dateStr: format(new Date(dateFrom), 'MMMM d, yyyy'),
        pdfBase64: base64,
        filename,
        totalFmv,
      });

      if (!result.success) {
        toast.error(result.error ?? 'Failed to send email');
        return;
      }
      toast.success(`Receipt emailed to ${emailTo}!`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Step 1: Donor + Date */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Search Donations</h2>

        {/* Donor search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Donor Name</label>
          {selectedDonor ? (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-purple-900 text-sm">{selectedDonor.name}</p>
                {selectedDonor.organization && <p className="text-xs text-purple-700">{selectedDonor.organization}</p>}
                {selectedDonor.email && <p className="text-xs text-purple-600">{selectedDonor.email}</p>}
              </div>
              <button onClick={() => { setSelectedDonor(null); setCheckIns([]); setSelectedIds(new Set()); }}
                className="text-purple-500 hover:text-red-500 text-sm ml-3">✕</button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={donorSearch}
                onChange={e => setDonorSearch(e.target.value)}
                placeholder="Start typing a donor name…"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 text-base"
                style={{ '--tw-ring-color': '#8d4982' } as React.CSSProperties}
              />
              {donorResults.length > 0 && (
                <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                  {donorResults.map(d => (
                    <button
                      key={d.id}
                      onClick={() => { setSelectedDonor(d); setDonorSearch(''); setDonorResults([]); }}
                      className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-gray-100 last:border-0"
                    >
                      <p className="font-medium text-gray-900 text-sm">{d.name}</p>
                      {d.organization && <p className="text-xs text-gray-500">{d.organization}</p>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 text-base"
              style={{ '--tw-ring-color': '#8d4982' } as React.CSSProperties} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 text-base"
              style={{ '--tw-ring-color': '#8d4982' } as React.CSSProperties} />
          </div>
        </div>

        <button
          onClick={searchCheckIns}
          disabled={!selectedDonor || loadingCheckIns}
          className="w-full text-white py-3 rounded-xl font-semibold disabled:opacity-40 transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#8d4982' }}
        >
          {loadingCheckIns ? 'Searching…' : '🔍 Search Donations'}
        </button>
      </div>

      {/* Step 2: Select check-ins */}
      {checkIns.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              {checkIns.length} donation{checkIns.length !== 1 ? 's' : ''} found
            </h2>
            <button onClick={selectAll} className="text-sm text-purple-700 hover:underline font-medium">
              Select All
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {checkIns.map(c => (
              <label key={c.id} className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedIds.has(c.id)}
                  onChange={() => toggleSelect(c.id)}
                  className="mt-0.5 w-4 h-4 accent-purple-700"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{c.inventory_items?.description}</p>
                  <p className="text-xs text-gray-500">{c.inventory_items?.category} · {c.condition}</p>
                  <p className="text-xs text-gray-400">{format(new Date(c.date_received), 'MMM d, yyyy')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-800">Qty: {c.quantity}</p>
                  <p className="text-sm text-green-700 font-medium">${(c.total_fmv ?? 0).toFixed(2)}</p>
                </div>
              </label>
            ))}
          </div>
          {selectedIds.size > 0 && (
            <div className="px-5 py-3 bg-purple-50 border-t border-purple-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-purple-900">
                {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
              </p>
              <p className="text-sm font-bold text-purple-900">
                Total FMV: ${totalFmv.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Generate / Email */}
      {selected.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Generate Receipt</h2>

          <button
            onClick={() => generatePDF(true)}
            className="w-full text-white py-3 rounded-xl font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#0063be' }}
          >
            📄 Download PDF Receipt
          </button>
        </div>
      )}
    </div>
  );
}
