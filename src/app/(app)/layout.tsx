import { AppShell } from '@/components/layout/AppShell';
import { SearchOverlay } from '@/components/search/SearchOverlay';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <SearchOverlay />
    </>
  );
}
