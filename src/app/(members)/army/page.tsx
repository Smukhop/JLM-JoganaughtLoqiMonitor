import type { Metadata } from 'next';
import WarRoom from '@/components/army/WarRoom';

export const metadata: Metadata = { title: 'War Room' };

export default function ArmyPage() {
  return <WarRoom />;
}
