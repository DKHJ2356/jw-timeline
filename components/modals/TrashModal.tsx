'use client';

import { useStore } from '@/lib/store';
import { cleanUpPhotos } from '@/lib/cleanup';
import ModalShell from '../ui/aceternity/animated-modal';

export default function TrashModal() {
  const trash = useStore((s) => s.trash);
  const restore = useStore((s) => s.restoreFromTrash);
  const deleteForever = useStore((s) => s.deleteFromTrash);
  const emptyTrash = useStore((s) => s.emptyTrash);
  const closeModal = useStore((s) => s.closeModal);
  const lowEnd = useStore((s) => s.lowEnd);

  return (
    <ModalShell title="Trash" onClose={closeModal} width={720}>
      <div className={`mt-2 grid gap-2 ${lowEnd ? 'cv-auto' : ''}`}>
        {trash.length
          ? trash.map((t) => (
              <div key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-[11px] border border-line p-2.5 sm:grid-cols-[1fr_auto_auto]">
                <span className="min-w-0">
                  <b className="block truncate">{t.title}</b>
                  <small className="muted">
                    {t.type} · moved to Trash {new Date(t.deletedAt).toLocaleDateString()}
                  </small>
                </span>
                <button className="btn" onClick={() => restore(t.id)}>
                  Restore
                </button>
                <button
                  className="btn btn-danger col-span-2 sm:col-span-1"
                  onClick={() => {
                    if (window.confirm('Permanently delete this item?')) {
                      deleteForever(t.id);
                      cleanUpPhotos();
                    }
                  }}
                >
                  Delete permanently
                </button>
              </div>
            ))
          : 'Trash is empty.'}
      </div>
      <button
        className="btn btn-danger mt-4 w-full"
        disabled={!trash.length}
        onClick={() => {
          if (window.confirm('Permanently empty all Trash?')) {
            emptyTrash();
            cleanUpPhotos();
          }
        }}
      >
        Empty Trash Permanently
      </button>
    </ModalShell>
  );
}
