import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { format } from 'date-fns';

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Stats
  const { data: items } = await supabase.from('inventory_items').select('*');
  const totalItems = items?.reduce((sum, i) => sum + i.current_quantity, 0) ?? 0;
  const lowStock = items?.filter(i => i.current_quantity > 0 && i.current_quantity < 3).length ?? 0;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { data: monthCheckouts } = await supabase
    .from('check_outs')
    .select('quantity')
    .gte('date_given', startOfMonth.toISOString().split('T')[0]);
  const checkedOutThisMonth = monthCheckouts?.reduce((sum, c) => sum + c.quantity, 0) ?? 0;

  const { data: checkIns } = await supabase.from('check_ins').select('total_fmv');
  const totalValue = checkIns?.reduce((sum, c) => sum + (c.total_fmv ?? 0), 0) ?? 0;

  // Location breakdown
  const locationMap: Record<string, number> = {};
  items?.forEach(i => {
    locationMap[i.storage_location] = (locationMap[i.storage_location] ?? 0) + i.current_quantity;
  });

  // Recent activity
  const { data: recentCheckIns } = await supabase
    .from('check_ins')
    .select('*, inventory_items(description), donors(name)')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: recentCheckOuts } = await supabase
    .from('check_outs')
    .select('*, inventory_items(description)')
    .order('created_at', { ascending: false })
    .limit(5);

  // Merge and sort by created_at
  type ActivityItem = {
    id: string;
    type: 'in' | 'out';
    description: string;
    person: string;
    date: string;
    created_at: string;
  };

  const activity: ActivityItem[] = [
    ...(recentCheckIns ?? []).map(ci => ({
      id: ci.id,
      type: 'in' as const,
      description: (ci.inventory_items as { description: string } | null)?.description ?? 'Unknown item',
      person: (ci.donors as { name: string } | null)?.name ?? 'Unknown donor',
      date: ci.date_received,
      created_at: ci.created_at,
    })),
    ...(recentCheckOuts ?? []).map(co => ({
      id: co.id,
      type: 'out' as const,
      description: (co.inventory_items as { description: string } | null)?.description ?? 'Unknown item',
      person: `${co.client_first_name} ${co.client_last_name}`,
      date: co.date_given,
      created_at: co.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return (
    <Layout role={profile?.role ?? 'case_manager'}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, {profile?.full_name ?? user.email}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Items in Stock', value: totalItems.toLocaleString(), color: 'text-green-700', bg: 'bg-green-50' },
            {
              label: 'Total FMV',
              value: `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              color: 'text-blue-700',
              bg: 'bg-blue-50',
            },
            { label: 'Checked Out This Month', value: checkedOutThisMonth.toLocaleString(), color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Low Stock Items', value: lowStock.toLocaleString(), color: 'text-red-600', bg: 'bg-red-50' },
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm"
            >
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide leading-tight">
                {stat.label}
              </p>
              <p className={`text-2xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/check-in"
            className="text-white rounded-2xl p-5 flex flex-col items-center gap-2 transition-opacity hover:opacity-90 shadow-sm"
            style={{ backgroundColor: '#0063be' }}
          >
            <span className="text-3xl">📥</span>
            <span className="font-semibold text-base">Check In Donation</span>
          </Link>
          <Link
            href="/check-out"
            className="text-white rounded-2xl p-5 flex flex-col items-center gap-2 transition-opacity hover:opacity-90 shadow-sm"
            style={{ backgroundColor: '#f6a03b' }}
          >
            <span className="text-3xl">📤</span>
            <span className="font-semibold text-base">Check Out Item</span>
          </Link>
        </div>

        {/* Inventory by Location */}
        {Object.keys(locationMap).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Inventory by Location</h2>
            <div className="space-y-3">
              {Object.entries(locationMap)
                .sort((a, b) => b[1] - a[1])
                .map(([loc, qty]) => (
                  <div key={loc} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{loc}</span>
                    <span className="font-semibold text-green-700">
                      {qty.toLocaleString()} item{qty !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-gray-400 text-sm">No activity yet. Start by checking in a donation!</p>
          ) : (
            <div className="space-y-3">
              {activity.map(item => (
                <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 text-sm">
                  <span className={`mt-0.5 text-base ${item.type === 'in' ? 'text-green-600' : 'text-orange-500'}`}>
                    {item.type === 'in' ? '📥' : '📤'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800">
                      <span className="font-medium">{item.description}</span>
                      <span className="text-gray-500">
                        {item.type === 'in' ? ' from ' : ' to '}
                        {item.person}
                      </span>
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {format(new Date(item.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
