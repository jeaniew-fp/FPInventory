'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QRDisplay({ itemId, description }: { itemId: string; description: string }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(itemId, { width: 200, margin: 2 }).then(setQrUrl).catch(() => {});
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
              <img src={qrUrl} alt="QR code" className="w-36 h-36 rounded-lg border border-gray-200" />
            </div>
            {/* Print view */}
            <div className="print-only text-center">
              <p className="font-bold text-base mb-1">Family Promise of Greater Washington County</p>
              <p className="text-sm mb-2">{description}</p>
              <img src={qrUrl} alt="QR code" className="mx-auto w-40 h-40" />
              <p className="text-xs font-mono mt-1">{itemId}</p>
            </div>
            <div className="no-print">
              <p className="text-sm font-mono text-gray-400 break-all mb-3">{itemId}</p>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                🖨️ Print QR Label
              </button>
            </div>
          </>
        ) : (
          <div className="w-36 h-36 bg-gray-100 rounded-lg animate-pulse" />
        )}
      </div>
    </div>
  );
}
