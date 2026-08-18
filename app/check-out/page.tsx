import { Suspense } from 'react';
import Layout from '@/components/Layout';
import CheckOutForm from './CheckOutForm';

export const dynamic = 'force-dynamic';

export default function CheckOutPage() {
  return (
    <Layout>
      <Suspense fallback={<div className="py-12 text-center" style={{ color: '#9a8fa0' }}>Loading…</div>}>
        <CheckOutForm />
      </Suspense>
    </Layout>
  );
}
