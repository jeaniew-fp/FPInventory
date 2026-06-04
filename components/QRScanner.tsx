'use client';
import { useEffect, useRef, useState } from 'react';

interface QRScannerProps {
  onScan: (itemId: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<unknown>(null);
  const [error, setError] = useState('');
  const containerId = 'qr-scanner-container';

  useEffect(() => {
    let html5QrCode: unknown;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        await (html5QrCode as { start: Function }).start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            // Handle both full URLs and raw UUIDs
            let itemId = decodedText.trim();

            // If it's a URL, extract the item param
            try {
              const url = new URL(decodedText);
              const param = url.searchParams.get('item');
              if (param) itemId = param;
            } catch {
              // Not a URL — use as-is (raw UUID)
            }

            // Validate UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(itemId)) {
              stopScanner();
              onScan(itemId);
            }
          },
          () => {} // ignore frame errors
        );
      } catch (err) {
        setError('Camera access denied or not available. Please allow camera access and try again.');
      }
    }

    async function stopScanner() {
      if (scannerRef.current) {
        try {
          await (scannerRef.current as { stop: Function }).stop();
          await (scannerRef.current as { clear: Function }).clear();
        } catch {}
        scannerRef.current = null;
      }
    }

    startScanner();
    return () => { stopScanner(); };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Scan QR Code</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div id={containerId} className="w-full rounded-xl overflow-hidden" />
              <p className="text-center text-xs text-gray-400 mt-3">
                Point your camera at an item's QR code label
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
