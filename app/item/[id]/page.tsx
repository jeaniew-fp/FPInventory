'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

type Item = {
  id: string;
  description: string;
  category: string;
  storage_location: string;
  current_quantity: number;
  item_type?: string;
  retailer?: string;
  face_value?: number;
};

export default function ItemLandingPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setItem(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">❓</p>
          <p className="text-gray-700 font-semibold">Item not found</p>
          <p className="text-gray-400 text-sm mt-1">This QR code may be outdated.</p>
        </div>
      </div>
    );
  }

  const isGiftCard = item.item_type === 'gift_card';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      {/* Logo / org name */}
      <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">
        Family Promise GWC
      </p>

      {/* Item card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 w-full max-w-sm text-center mb-6">
        <p className="text-3xl mb-2">{isGiftCard ? '🎁' : '📦'}</p>
        <h1 className="text-xl font-bold text-gray-900">{item.description}</h1>
        {isGiftCard && item.retailer && (
          <p className="text-sm text-purple-700 mt-0.5">{item.retailer}{item.face_value ? ` · $${item.face_value.toFixed(2)} each` : ''}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">{item.category} · {item.storage_location}</p>
        <div className={`inline-block mt-3 px-4 py-1.5 rounded-full text-sm font-bold ${
          item.current_quantity === 0
            ? 'bg-red-100 text-red-600'
            : item.current_quantity < 3
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-green-100 text-green-700'
        }`}>
          {item.current_quantity} in stock
        </div>
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-sm space-y-3">
        <Link
          href={`/check-in?item=${item.id}`}
          className="flex items-center justify-center gap-3 w-full text-white py-4 rounded-2xl font-semibold text-lg shadow-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#0063be' }}
        >
          <span className="text-2xl">📥</span>
          Check In Donation
        </Link>

        <Link
          href={`/check-out?item=${item.id}`}
          className="flex items-center justify-center gap-3 w-full text-white py-4 rounded-2xl font-semibold text-lg shadow-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#f6a03b' }}
        >
          <span className="text-2xl">📤</span>
          Check Out to Client
        </Link>
      </div>
    </div>
  );
}
