'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/check-in', label: 'Check In', icon: '📥' },
  { href: '/check-out', label: 'Check Out', icon: '📤' },
  { href: '/inventory', label: 'Inventory', icon: '📦' },
];

export default function Nav({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success('Signed out');
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      {/* Desktop top nav */}
      <nav className="hidden md:flex items-center justify-between px-8 py-3 text-white no-print" style={{ backgroundColor: '#8d4982' }}>
        <div className="flex items-center gap-3">
          <Image src="/fpgwc-logo.png" alt="FPGWC Logo" width={40} height={40} className="rounded-full" />
          <span className="font-semibold text-lg">FPGWC Inventory</span>
        </div>
        <div className="flex items-center gap-6">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors ${
                pathname === item.href ? 'text-yellow-300' : 'text-purple-100 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {(role === 'admin' || role === 'coordinator') && (
            <Link
              href="/receipts"
              className={`text-sm font-medium transition-colors ${
                pathname === '/receipts' ? 'text-yellow-300' : 'text-purple-100 hover:text-white'
              }`}
            >
              Receipts
            </Link>
          )}
          {role === 'admin' && (
            <>
              <Link
                href="/reports"
                className={`text-sm font-medium transition-colors ${
                  pathname === '/reports' ? 'text-yellow-300' : 'text-purple-100 hover:text-white'
                }`}
              >
                Reports
              </Link>
              <Link
                href="/admin"
                className={`text-sm font-medium transition-colors ${
                  pathname === '/admin' ? 'text-yellow-300' : 'text-purple-100 hover:text-white'
                }`}
              >
                Admin
              </Link>
            </>
          )}
          <Link
            href="/account"
            className={`text-sm font-medium transition-colors ${
              pathname === '/account' ? 'text-yellow-300' : 'text-purple-100 hover:text-white'
            }`}
          >
            My Account
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-purple-200 hover:text-white transition-colors ml-4 border border-purple-400 px-3 py-1 rounded-lg"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Mobile top bar */}
      <div className="md:hidden px-4 py-3 flex items-center justify-between text-white no-print" style={{ backgroundColor: '#8d4982' }}>
        <div className="flex items-center gap-2">
          <Image src="/fpgwc-logo.png" alt="FPGWC Logo" width={32} height={32} className="rounded-full" />
          <span className="font-semibold text-base">FPGWC Inventory</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/account"
            className="text-xs text-purple-200 hover:text-white"
          >
            Account
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs text-purple-200 hover:text-white border border-purple-400 px-2 py-1 rounded-md"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50 no-print">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors"
            style={{ color: pathname === item.href ? '#8d4982' : '#6b7280' }}
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            {item.label}
          </Link>
        ))}
        {(role === 'admin' || role === 'coordinator') && (
          <Link
            href="/receipts"
            className="flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors"
            style={{ color: pathname === '/receipts' ? '#8d4982' : '#6b7280' }}
          >
            <span className="text-xl mb-0.5">🧾</span>
            Receipts
          </Link>
        )}
        {role === 'admin' && (
          <Link
            href="/reports"
            className="flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors"
            style={{ color: pathname === '/reports' ? '#8d4982' : '#6b7280' }}
          >
            <span className="text-xl mb-0.5">📊</span>
            Reports
          </Link>
        )}
      </nav>
    </>
  );
}
