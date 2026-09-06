import type { Metadata } from 'next';
import ChatStudio from '@/components/studio/ChatStudio';

export const metadata: Metadata = { title: 'ChatStudio' };

export default function StudioPage() {
  return <ChatStudio />;
}
