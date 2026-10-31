'use client';

import { useState } from 'react';
import { backupSummary, restoreBackup } from '@/lib/backup';
import { forgetPhotoUrls } from '@/lib/images';
import { useStore } from '@/lib/store';
import type { BackupFile } from '@/lib/types';
import { saveBackup } from '../header/actions';
import { cleanUpPhotos } from '@/lib/cleanup';
import ModalShell from '../ui/aceternity/animated-modal';

export default function RestoreModal({ backup }: { backup: BackupFile }) {
  const closeModal = useStore((s) => s.closeModal);
  const replaceAll = useStore((s) => s.replaceAll);
  const toast = useStore((s) => s.toast);
  const [busy, setBusy] = useState(false);
  const s = backupSummary(backup);

  const confirm = async () => {
    setBusy(true);
    try {
      await saveBackup('Safety-Backup-Before-Restore');
      const { state, settings } = await restoreBackup(backup);
      forgetPhotoUrls(Object.keys(backup.images ?? {}));
      replaceAll(state, {
        theme: settings.theme === 'dark' ? 'dark' : settings.theme === 'light' ? 'light' : undefined,
        zoom: settings.zoom,
        canvasH: settings.canvasHeight,
      });
      toast('Backup restored successfully.');
      cleanUpPhotos();
    } catch (e) {
      console.error(e);
      setBusy(false);
      toast(e instanceof Error && e.name === 'StorageFullError' ? e.message : 'The backup could not be restored.', 'error');
    }
  };

  return (
    <ModalShell title="Restore complete backup" onClose={() => !busy && closeModal()} width={620}>
      <div className="my-3 rounded-xl bg-accent/10 p-3 leading-relaxed">
        <b>Backup:</b> {s.createdAt ? s.createdAt.toLocaleString() : 'unknown date'} (format {s.version})
        <br />
        <b>Entries:</b> {s.entries}
        <br />
        <b>Pictures:</b> {s.images}
        <br />
        <b>Trash:</b> {s.trash}
      </div>
      <p>Restoring will replace the current timeline. A safety backup of the current timeline will be downloaded first.</p>
      <div className="flex flex-wrap justify-between gap-2">
        <button className="btn" disabled={busy} onClick={closeModal}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={busy} onClick={confirm}>
          {busy ? 'Restoring…' : 'Safety backup, then Restore'}
        </button>
      </div>
    </ModalShell>
  );
}
