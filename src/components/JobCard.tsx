import React from 'react';
import type { JobSummary } from '../types';
import { t } from '../i18n';

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

function stateLabel(state: string): string {
  const map: Record<string, any> = {
    Uploaded:   'stateUploaded',
    Uploading:  'stateUploading',
    Processing: 'stateProcessing',
    Paused:     'statePaused',
    Finished:   'stateFinished',
    Failed:     'stateFailed',
    Cancelled:  'stateCancelled',
  };
  return t(map[state] ?? 'stateFailed');
}

function fmtDuration(from: Date, to: Date): string {
  const s = Math.floor((to.getTime() - from.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

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
      style={{
        ...S.card,
        ...(active ? S.cardActive : {}),
        borderLeftColor: color,
      }}
    >
      <div style={S.row}>
        <div style={S.name} title={job.fileName}>{job.fileName}</div>
        <span style={{ ...S.badge, color }}>{stateLabel(job.state)}</span>
      </div>
      {isActive && (
        <div style={S.barTrack}>
          <div style={{ ...S.barFill, width: `${job.progress}%` }} />
        </div>
      )}
      <div style={S.meta}>
        <span>{job.currentStep !== 'None' ? job.currentStep : ''}</span>
        {elapsed && <span>{elapsed}</span>}
      </div>
    </div>
  );
};

function fmtDurationExported(from: Date, to: Date): string {
  const s = Math.floor((to.getTime() - from.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

const S: Record<string, React.CSSProperties> = {
  card:     { padding: '10px 12px', borderRadius: 8, background: '#0a1628', border: '1px solid #0f1f35', borderLeft: '3px solid', cursor: 'pointer', transition: 'all .15s', display: 'flex', flexDirection: 'column', gap: 6 },
  cardActive: { background: '#071d2e', borderColor: '#1e3a5e' },
  row:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name:     { fontSize: 11, fontWeight: 600, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  badge:    { fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', flexShrink: 0, textTransform: 'uppercase' },
  barTrack: { height: 3, background: '#1e293b', borderRadius: 2, overflow: 'hidden' },
  barFill:  { height: '100%', background: 'linear-gradient(90deg, #0ea5e9, #22d3ee)', borderRadius: 2, transition: 'width .5s ease' },
  meta:     { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#334155' },
};
