import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Layout from '@/components/Layout';
import { format } from 'date-fns';
import QRDisplay from './QRDisplay';

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  const { data: item } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', id)
    .single();

  if (!item) notFound();

  const { data: checkIns } = await supabase
    .from('check_ins')
    .select('*, donors(name, organization)')
    .eq('inventory_item_id', id)
    .order('date_received', { ascending: false });

  const { data: checkOuts } = await supabase
    .from('check_outs')
    .select('*, profiles(full_name)')
    .eq('inventory_item_id', id)
    .order('date_given', { ascending: false });

  const totalReceived = checkIns?.reduce((s, c) => s + c.quantity, 0) ?? 0;
  const totalGiven = checkOuts?.reduce((s, c) => s + c.quantity, 0) ?? 0;
  const totalFmv = checkIns?.reduce((s, c) => s + (c.total_fmv ?? 0), 0) ?? 0;

  return (
    <Layout role={profile?.role ?? 'case_manager'}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <a href="/inventory" className="text-sm text-gray-500 hover:text-green-700 mb-2 inline-block">
              ← Back to Inventory
            </a>
            <h1 className="text-2xl font-bold text-gray-900">{item.description}</h1>
            <p className="text-gray-500 text-sm mt-1">{item.category} · {item.storage_location}</p>
          </div>
          <div className={`px-4 py-2 rounded-xl text-lg font-bold ${
            item.current_quantity === 0
              ? 'bg-red-100 text-red-600'
              : item.current_quantity < 3
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {item.current_quantity} in stock
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-700">{totalReceived}</p>
            <p className="text-xs text-gray-500 mt-1">Total Received</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-orange-600">{totalGiven}</p>
            <p className="text-xs text-gray-500 mt-1">Total Given</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-700">${totalFmv.toFixed(0)}</p>
            <p className="text-xs text-gray-500 mt-1">Total FMV</p>
          </div>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">QR Code Label</h2>
          </div>
          <QRDisplay itemId={item.qr_code || item.id} description={item.description} />
        </div>

        {/* Check-ins */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Check-Ins</h2>
            <span className="text-sm text-gray-400">{checkIns?.length ?? 0} records</span>
          </div>
          {!checkIns || checkIns.length === 0 ? (
            <p className="text-gray-400 text-sm px-5 py-6">No check-ins yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {checkIns.map(ci => (
                <div key={ci.id} className="px-5 py-4 flex gap-4 items-start">
                  {ci.photo_url && (
                    <img
                      src={ci.photo_url}
                      alt="Item photo"
                      className="w-14 h-14 rounded-lg object-cover shrink-0 border border-gray-200"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span className="font-medium text-gray-900">
                        {(ci.donors as { name: string } | null)?.name ?? 'Unknown donor'}
                      </span>
                      <span className="text-gray-500">Qty: {ci.quantity}</span>
                      <span className="text-gray-500">{ci.condition}</span>
                      <span className="text-green-700 font-medium">${ci.total_fmv?.toFixed(2)}</span>
                    </div>
                    {ci.notes && <p className="text-xs text-gray-400 mt-1">{ci.notes}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(ci.date_received), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Check-outs */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Check-Outs</h2>
            <span className="text-sm text-gray-400">{checkOuts?.length ?? 0} records</span>
          </div>
          {!checkOuts || checkOuts.length === 0 ? (
            <p className="text-gray-400 text-sm px-5 py-6">No check-outs yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {checkOuts.map(co => (
                <div key={co.id} className="px-5 py-4 text-sm">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className="font-medium text-gray-900">
                      {co.client_first_name} {co.client_last_name}
                    </span>
                    {co.hmis_number && (
                      <span className="text-gray-500 text-xs bg-gray-100 px-2 py-0.5 rounded">
                        HMIS: {co.hmis_number}
                      </span>
                    )}
                    <span className="text-orange-600 font-medium">Qty: {co.quantity}</span>
                    <span className="text-gray-500">{co.program}</span>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    {(co.profiles as { full_name: string } | null)?.full_name} · {format(new Date(co.date_given), 'MMMM d, yyyy')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
