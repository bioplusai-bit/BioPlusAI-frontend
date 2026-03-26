import React, { useState, useRef, useCallback } from 'react';
import { t } from '../i18n';

interface Props {
  onFile: (f: File) => void;
  loading: boolean;
}

const ACCEPTED = ['.bam', '.vcf', '.fastq', '.txt'];

export const UploadZone: React.FC<Props> = ({ onFile, loading }) => {
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const pick = useCallback((f: File) => {
    setFile(f);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) pick(f);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file && !loading) onFile(file);
  };

  const fmt = (n: number) =>
    n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB`
    : n > 1_000   ? `${(n / 1_000).toFixed(0)} KB`
    : `${n} B`;

  return (
    <form onSubmit={submit} style={S.form}>
      <div
        style={{ ...S.zone, ...(drag ? S.zoneDrag : {}), ...(file ? S.zoneReady : {}) }}
        onClick={() => !loading && ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <input
          ref={ref} type="file"
          accept={ACCEPTED.join(',')}
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) pick(f); }}
        />

        {file ? (
          <div style={S.fileInfo}>
            <div style={S.fileIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div>
              <div style={S.fileName}>{file.name}</div>
              <div style={S.fileMeta}>{fmt(file.size)}</div>
            </div>
            <button
              type="button"
              style={S.removeBtn}
              onClick={e => { e.stopPropagation(); setFile(null); }}
            >✕</button>
          </div>
        ) : (
          <div style={S.placeholder}>
            <div style={S.uploadIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <polyline points="16 16 12 12 8 16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
            </div>
            <div style={S.placeholderText}>
              {drag ? '📂' : t('dropHere')}
            </div>
            <div style={S.placeholderSub}>{t('or')} <span style={{ color: '#38bdf8' }}>{t('browse')}</span></div>
            <div style={S.formats}>
              {ACCEPTED.map(ext => (
                <span key={ext} style={S.formatBadge}>{ext}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!file || loading}
        style={{ ...S.btn, ...(!file || loading ? S.btnOff : S.btnOn) }}
      >
        {loading ? (
          <span style={S.btnContent}>
            <span style={S.spinner} />
            {t('uploading')}
          </span>
        ) : (
          <span style={S.btnContent}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            {t('analyze')}
          </span>
        )}
      </button>
    </form>
  );
};

const S: Record<string, React.CSSProperties> = {
  form:          { display: 'flex', flexDirection: 'column', gap: 12 },
  zone:          { border: '1.5px dashed #334155', borderRadius: 12, padding: 32, cursor: 'pointer', transition: 'all .2s', background: '#0f172a', minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  zoneDrag:      { borderColor: '#38bdf8', background: '#0c1a2e' },
  zoneReady:     { borderColor: '#22d3ee', borderStyle: 'solid', background: '#071d2e' },
  placeholder:   { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  uploadIcon:    { color: '#475569', marginBottom: 4 },
  placeholderText: { color: '#94a3b8', fontSize: 14, fontWeight: 500 },
  placeholderSub:  { color: '#475569', fontSize: 12 },
  formats:       { display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  formatBadge:   { padding: '2px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: 4, fontSize: 10, color: '#64748b', fontFamily: 'monospace' },
  fileInfo:      { display: 'flex', alignItems: 'center', gap: 16, width: '100%' },
  fileIcon:      { color: '#22d3ee', flexShrink: 0 },
  fileName:      { fontSize: 14, fontWeight: 600, color: '#e2e8f0', wordBreak: 'break-all' },
  fileMeta:      { fontSize: 12, color: '#64748b', marginTop: 2 },
  removeBtn:     { marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, padding: 4, flexShrink: 0 },
  btn:           { padding: '12px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all .2s', letterSpacing: '0.02em' },
  btnOn:         { background: '#0ea5e9', color: '#fff' },
  btnOff:        { background: '#1e293b', color: '#475569', cursor: 'not-allowed' },
  btnContent:    { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' },
  spinner:       { width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' },
};
