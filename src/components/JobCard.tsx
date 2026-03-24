import React from 'react';
import type { JobSummary } from '../types';

interface Props {
  job:      JobSummary;
  active:   boolean;
  onClick:  () => void;
}

const STATE_COLOR: Record<string, string> = {
  Finished:   '#22d3ee',
  Failed:     '#ef4444',
  Paused:     '#f59e0b',
  Processing: '#818cf8',
  Uploading:  '#818cf8',
  Uploaded:   '#475569',
  Cancelled:  '#475569',
};

const STATE_LABEL: Record<string, string> = {
  Uploaded:   'Yuklandi',
  Uploading:  'Yuklanmoqda',
  Processing: 'Ishlayapti',
  Paused:     "To'xtatildi",
  Finished:   'Tugadi',
  Failed:     'Xato',
  Cancelled:  'Bekor',
};

const STEP_LABEL: Record<string, string> = {
  None:          '—',
  Uploading:     'MinIO',
  DeepVariant:   'DeepVariant',
  SavingResults: 'Saqlash',
  Completed:     'Tayyor',
};

export const JobCard: React.FC<Props> = ({ job, active, onClick }) => {
  const color   = STATE_COLOR[job.state] ?? '#475569';
  const isActive = ['Processing', 'Uploading'].includes(job.state);

  const elapsed = job.finishedAt
    ? fmtDuration(new Date(job.createdAt), new Date(job.finishedAt))
    : isActive
    ? fmtDuration(new Date(job.createdAt), new Date())
    : null;

  return (
    <div
      onClick={onClick}
      style={{ ...S.card, ...(active ? S.cardActive : {}) }}
    >
      {/* Colored left border */}
      <div style={{ ...S.accent, background: color }} />

      <div style={S.body}>
        {/* File name */}
        <div style={S.name} title={job.fileName}>
          {job.fileName.length > 26
            ? job.fileName.slice(0, 23) + '...'
            : job.fileName}
        </div>

        {/* State badge + step */}
        <div style={S.row}>
          <span style={{ ...S.badge, color, borderColor: color + '40', background: color + '15' }}>
            {isActive && <span style={{ ...S.dot, background: color }} />}
            {STATE_LABEL[job.state] ?? job.state}
          </span>
          {job.currentStep !== 'None' && (
            <span style={S.step}>{STEP_LABEL[job.currentStep]}</span>
          )}
        </div>

        {/* Progress bar (only when active or paused) */}
        {(isActive || job.state === 'Paused') && (
          <div style={S.miniTrack}>
            <div style={{ ...S.miniFill, width: `${job.progress}%`, background: color }} />
          </div>
        )}

        {/* Meta */}
        <div style={S.meta}>
          <span>{new Date(job.createdAt).toLocaleString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          {job.variantCount > 0 && <span style={S.varCount}>{job.variantCount} variant</span>}
          {elapsed && <span style={S.elapsed}>{elapsed}</span>}
        </div>
      </div>
    </div>
  );
};

function fmtDuration(from: Date, to: Date): string {
  const s = Math.floor((to.getTime() - from.getTime()) / 1000);
  if (s < 60)  return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

const S: Record<string, React.CSSProperties> = {
  card:      { display: 'flex', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, cursor: 'pointer', overflow: 'hidden', transition: 'all .15s' },
  cardActive:{ border: '1px solid #0ea5e9', background: '#071d2e' },
  accent:    { width: 3, flexShrink: 0 },
  body:      { flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 },
  name:      { fontSize: 12, fontWeight: 600, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  row:       { display: 'flex', alignItems: 'center', gap: 6 },
  badge:     { fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, border: '1px solid', display: 'flex', alignItems: 'center', gap: 4 },
  dot:       { width: 5, height: 5, borderRadius: '50%', animation: 'pulse 1.4s ease-in-out infinite' },
  step:      { fontSize: 10, color: '#475569', fontFamily: 'monospace' },
  miniTrack: { height: 2, background: '#1e293b', borderRadius: 1, overflow: 'hidden' },
  miniFill:  { height: '100%', borderRadius: 1, transition: 'width .4s ease' },
  meta:      { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  elapsed:   { fontSize: 10, color: '#334155', marginLeft: 'auto' },
  varCount:  { fontSize: 10, color: '#22d3ee', fontWeight: 600 },
};
