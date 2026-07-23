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
      <nav className="hidden md:flex items-center justify-between px-6 text-white no-print" style={{ background: 'linear-gradient(100deg,#f5a623 0%,#d1618a 50%,#7c3a9e 100%)', height: '66px' }}>
        <div className="flex items-center gap-3 mr-auto">
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.15)', flexShrink: 0 }}>
            <Image src="/fpgwc-logo.png" alt="FPGWC Logo" width={42} height={42} style={{ borderRadius: '50%', objectFit: 'contain' }} />
          </div>
          <span className="font-extrabold text-lg">FPGWC Inventory</span>
        </div>
        <div className="flex items-center gap-1.5">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold transition-colors px-3 py-1.5 rounded-lg"
              style={pathname === item.href
                ? { color: '#fff', background: 'rgba(255,255,255,.24)' }
                : { color: 'rgba(255,255,255,.9)' }}
            >
              {item.label}
            </Link>
          ))}
          {(role === 'admin' || role === 'coordinator') && (
            <Link
              href="/receipts"
              className="text-sm font-semibold transition-colors px-3 py-1.5 rounded-lg"
              style={pathname === '/receipts'
                ? { color: '#fff', background: 'rgba(255,255,255,.24)' }
                : { color: 'rgba(255,255,255,.9)' }}
            >
              Receipts
            </Link>
          )}
          {role === 'admin' && (
            <>
              <Link
                href="/reports"
                className="text-sm font-semibold transition-colors px-3 py-1.5 rounded-lg"
                style={pathname === '/reports'
                  ? { color: '#fff', background: 'rgba(255,255,255,.24)' }
                  : { color: 'rgba(255,255,255,.9)' }}
              >
                Reports
              </Link>
              <Link
                href="/admin"
                className="text-sm font-semibold transition-colors px-3 py-1.5 rounded-lg"
                style={pathname === '/admin'
                  ? { color: '#fff', background: 'rgba(255,255,255,.24)' }
                  : { color: 'rgba(255,255,255,.9)' }}
              >
                Admin
              </Link>
            </>
          )}
          <Link
            href="/account"
            className="text-sm font-semibold transition-colors px-3 py-1.5 rounded-lg"
            style={pathname === '/account'
              ? { color: '#fff', background: 'rgba(255,255,255,.24)' }
              : { color: 'rgba(255,255,255,.9)' }}
          >
            My Account
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm font-semibold transition-colors ml-1.5"
            style={{ color: '#fff', border: '1.5px solid rgba(255,255,255,.6)', padding: '7px 14px', borderRadius: '9px' }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Mobile top bar */}
      <div className="md:hidden px-4 flex items-center justify-between text-white no-print" style={{ background: 'linear-gradient(100deg,#f5a623 0%,#d1618a 50%,#7c3a9e 100%)', height: '56px' }}>
        <div className="flex items-center gap-2">
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.15)', flexShrink: 0 }}>
            <Image src="/fpgwc-logo.png" alt="FPGWC Logo" width={32} height={32} style={{ borderRadius: '50%', objectFit: 'contain' }} />
          </div>
          <span className="font-extrabold text-base">FPGWC Inventory</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/account"
            className="text-xs font-semibold"
            style={{ color: 'rgba(255,255,255,.9)' }}
          >
            Account
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs font-semibold"
            style={{ color: '#fff', border: '1.5px solid rgba(255,255,255,.6)', padding: '5px 10px', borderRadius: '8px' }}
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
            style={{ color: pathname === item.href ? '#8b4a72' : '#6b7280' }}
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            {item.label}
          </Link>
        ))}
        {(role === 'admin' || role === 'coordinator') && (
          <Link
            href="/receipts"
            className="flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors"
            style={{ color: pathname === '/receipts' ? '#8b4a72' : '#6b7280' }}
          >
            <span className="text-xl mb-0.5">🧾</span>
            Receipts
          </Link>
        )}
        {role === 'admin' && (
          <Link
            href="/reports"
            className="flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors"
            style={{ color: pathname === '/reports' ? '#8b4a72' : '#6b7280' }}
          >
            <span className="text-xl mb-0.5">📊</span>
            Reports
          </Link>
        )}
      </nav>
    </>
  );
}
