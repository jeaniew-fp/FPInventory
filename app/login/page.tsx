'use client';
import { useState, Suspense } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#f5a623 0%,#d1618a 50%,#7c3a9e 100%)' }}>
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,.12)', transform: 'translate(30%,-30%)' }} />
      <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,.10)', transform: 'translate(-30%,30%)' }} />

      <div className="w-full max-w-sm relative z-10">
        <div className="bg-white rounded-3xl p-8" style={{ boxShadow: '0 24px 60px -16px rgba(58,31,74,.45)' }}>
          {/* Logo + title */}
          <div className="text-center mb-7">
            <div className="mx-auto mb-4 flex items-center justify-center rounded-full bg-white" style={{ width: 80, height: 80, boxShadow: '0 4px 16px rgba(0,0,0,.12)' }}>
              <Image src="/fpgwc-logo.png" alt="FPGWC Logo" width={72} height={72} style={{ borderRadius: '50%', objectFit: 'contain' }} />
            </div>
            <h1 className="text-2xl font-extrabold" style={{ color: '#3a1f4a' }}>FPGWC Inventory</h1>
            <p className="text-sm mt-1 font-medium" style={{ color: '#8b4a72' }}>Family Promise of Greater Washington County</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#4d4457' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2"
                style={{ border: '1.5px solid #e3ddec', background: '#fbfafd', color: '#3a1f4a' }}
                placeholder="you@fpgwc.org"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#4d4457' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2"
                style={{ border: '1.5px solid #e3ddec', background: '#fbfafd', color: '#3a1f4a' }}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-xl font-extrabold text-base disabled:opacity-50 transition-opacity hover:opacity-90 mt-2"
              style={{ background: 'linear-gradient(120deg,#f5a623,#d1618a 55%,#7c3a9e)', boxShadow: '0 14px 30px -10px rgba(124,58,158,.6)' }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs mt-5" style={{ color: '#a79fb0' }}>
            Contact your administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
