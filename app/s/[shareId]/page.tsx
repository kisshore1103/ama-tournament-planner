import type { Metadata } from 'next';
import SharedSchedule from '@/components/shared/SharedSchedule';
export const metadata: Metadata = {
  title: 'AMA Shared Schedule',
  robots: { index: false, follow: false, noarchive: true },
};
export default async function Page({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  return <SharedSchedule shareId={shareId} />;
}
