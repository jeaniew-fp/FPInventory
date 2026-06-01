import Nav from './Nav';

export default function Layout({
  children,
  role,
}: {
  children: React.ReactNode;
  role: string;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role={role} />
      <main className="pb-24 md:pb-8 px-4 py-6 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
