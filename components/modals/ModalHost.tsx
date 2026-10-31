'use client';

import { AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useStore, type Modal } from '@/lib/store';

// Each modal is loaded the first time it is opened.
const DetailModal = dynamic(() => import('./DetailModal'), { ssr: false });
const EntryForm = dynamic(() => import('./EntryForm/EntryForm'), { ssr: false });
const EntryFilterModal = dynamic(() => import('./EntryFilterModal'), { ssr: false });
const TrashModal = dynamic(() => import('./TrashModal'), { ssr: false });
const RestoreModal = dynamic(() => import('./RestoreModal'), { ssr: false });

function render(modal: NonNullable<Modal>) {
  switch (modal.kind) {
    case 'detail':
      return <DetailModal key={`d${modal.id}`} id={modal.id} />;
    case 'form':
      return <EntryForm key={`f${modal.id ?? 'new'}`} id={modal.id} />;
    case 'filter':
      return <EntryFilterModal key="filter" />;
    case 'trash':
      return <TrashModal key="trash" />;
    case 'restore':
      return <RestoreModal key="restore" backup={modal.backup} />;
  }
}

export default function ModalHost() {
  const modal = useStore((s) => s.modal);
  return <AnimatePresence>{modal ? render(modal) : null}</AnimatePresence>;
}
