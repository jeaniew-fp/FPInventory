'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QRDisplay({ itemId, description }: { itemId: string; description: string }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState('');

  useEffect(() => {
    // Build the full checkout URL so phone cameras open directly to the checkout page
    const url = `${window.location.origin}/item/${itemId}`;
    setCheckoutUrl(url);
    QRCode.toDataURL(url, { width: 220, margin: 2 }).then(setQrUrl).catch(() => {});
  }, [itemId]);

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {qrUrl ? (
          <>
            {/* Screen view */}
            <div className="no-print">
              <img src={qrUrl} alt="QR code" className="w-40 h-40 rounded-lg border border-gray-200" />
            </div>

            {/* Print-only label */}
            <div className="print-only text-center">
              <p className="font-bold text-base mb-1">Family Promise of Greater Washington County</p>
              <p className="text-sm mb-2">{description}</p>
              <img src={qrUrl} alt="QR code" className="mx-auto w-48 h-48" />
              <p className="text-xs mt-1 break-all">{checkoutUrl}</p>
            </div>

            <div className="no-print space-y-2">
              <p className="text-xs text-gray-400 break-all">
                📱 Scan to go directly to checkout
              </p>
              <p className="text-xs font-mono text-gray-300 break-all">{checkoutUrl}</p>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                🖨️ Print QR Label
              </button>
            </div>
          </>
        ) : (
          <div className="w-40 h-40 bg-gray-100 rounded-lg animate-pulse" />
        )}
      </div>
    </div>
  );
}
