import { useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { readBackup, restoreBackup } from '../../lib/store/database';

type Status = { tone: 'ok' | 'bad'; message: string } | null;

function downloadJson(contents: string, filename: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function shareJson(contents: string, filename: string) {
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: contents,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });

  await Share.share({
    title: 'PERFORMANCE yedeği',
    text: 'Antrenman verilerimin PERFORMANCE yedeği',
    url: uri,
    dialogTitle: 'Yedeği kaydet veya paylaş',
  });
}

export function BackupPanel() {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    setBusy(true);
    try {
      const backup = await readBackup();
      const date = backup.exportedAt.slice(0, 10);
      const contents = JSON.stringify(backup, null, 2);
      const filename = `performance-yedek-${date}.json`;
      if (Capacitor.isNativePlatform()) {
        await shareJson(contents, filename);
        setStatus({ tone: 'ok', message: 'Yedek paylaşıma hazır.' });
      } else {
        downloadJson(contents, filename);
        setStatus({ tone: 'ok', message: 'Yedek indirildi.' });
      }
    } catch {
      setStatus({ tone: 'bad', message: 'Yedek oluşturulamadı.' });
    } finally {
      setBusy(false);
    }
  };

  const importData = async (file: File) => {
    if (!window.confirm('Mevcut program ve antrenman kayıtları bu yedekle değiştirilsin mi?')) return;
    setBusy(true);
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      await restoreBackup(parsed as never);
      setStatus({ tone: 'ok', message: 'Yedek geri yüklendi.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Yedek geri yüklenemedi.';
      setStatus({ tone: 'bad', message });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <section className="hub-sec backup-card" aria-labelledby="backup-title">
      <div className="sec-h">
        <h3 id="backup-title">Verilerim</h3>
        <span className="sec-k mono">yalnızca bu cihazda</span>
      </div>
      <p>Programlarını, antrenmanlarını ve özel hareketlerini tek JSON dosyasında sakla.</p>
      <div className="backup-actions">
        <button type="button" className="btn primary" onClick={exportData} disabled={busy}>Yedekle</button>
        <button type="button" className="btn ghost" onClick={() => input.current?.click()} disabled={busy}>Geri yükle</button>
        <input
          ref={input}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importData(file);
          }}
        />
      </div>
      {status ? <div className={`backup-status ${status.tone}`} role="status">{status.message}</div> : null}
    </section>
  );
}
