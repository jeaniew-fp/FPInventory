import { Suspense } from 'react';
import Layout from '@/components/Layout';
import CheckInForm from './CheckInForm';

export default function CheckInPage() {
  return (
    <Layout>
      <Suspense fallback={<div className="py-12 text-center" style={{ color: '#9a8fa0' }}>Loading…</div>}>
        <CheckInForm />
      </Suspense>
    </Layout>
  );
}
