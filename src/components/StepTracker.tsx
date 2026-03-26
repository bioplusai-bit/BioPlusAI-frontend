import React from 'react';
import type { AnalysisStep, JobState } from '../types';
import { t } from '../i18n';

interface Step { key: AnalysisStep; labelKey: string; subKey: string; }

const STEPS: Step[] = [
  { key: 'Uploading',     labelKey: 'MinIO',           subKey: 'stepMinioSub'         },
  { key: 'DeepVariant',   labelKey: 'DeepVariant',     subKey: 'stepDeepVariantSub'   },
  { key: 'AlphaMissense', labelKey: 'AlphaMissense',   subKey: 'stepAlphaMissenseSub' },
  { key: 'HyenaDna',      labelKey: 'HyenaDNA',        subKey: 'stepHyenaDnaSub'      },
  { key: 'ClinVar',       labelKey: 'ClinVar',         subKey: 'stepClinVarSub'       },
  { key: 'Completed',     labelKey: 'stepCompletedLabel', subKey: 'stepCompletedSub'  },
];

const ORDER: AnalysisStep[] = [
  'None', 'Uploading', 'DeepVariant',
  'AlphaMissense', 'HyenaDna', 'ClinVar', 'SavingResults', 'Completed'
];

type Status = 'done' | 'active' | 'pending' | 'failed';

function getStatus(stepKey: AnalysisStep, current: AnalysisStep, state: JobState): Status {
  if (state === 'Failed') {
    const ci = ORDER.indexOf(current);
    const si = ORDER.indexOf(stepKey);
    if (si === ci) return 'failed';
    if (si < ci)  return 'done';
    return 'pending';
  }
  const ci = ORDER.indexOf(current);
  const si = ORDER.indexOf(stepKey);
  if (current === 'Completed' || si < ci) return 'done';
  if (si === ci) return 'active';
  return 'pending';
}

interface Props {
  currentStep: AnalysisStep;
  state:       JobState;
  progress:    number;
  message:     string | null;
}

export const StepTracker: React.FC<Props> = ({ currentStep, state, progress, message }) => {
  return (
    <div style={S.wrap}>
      <div style={S.stepsRow}>
        {STEPS.map((step, i) => {
          const status = getStatus(step.key, currentStep, state);
          // labelKey is either a fixed string (like 'MinIO') or a translation key
          const label = step.labelKey.startsWith('step') ? t(step.labelKey as any) : step.labelKey;
          const sub   = t(step.subKey as any);
          return (
            <React.Fragment key={step.key}>
              <div style={S.stepCol}>
                <div style={{ ...S.circle, ...circleStyle(status) }}>
                  {status === 'done'   ? <DoneIcon />  :
                   status === 'failed' ? <FailIcon />  :
                   status === 'active' ? <ActiveDot /> :
                   <span style={S.circleNum}>{i + 1}</span>}
                </div>
                <div style={S.stepLabel}>{label}</div>
                <div style={S.stepSub}>{sub}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ ...S.line, ...(status === 'done' ? S.lineDone : {}) }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div style={S.barWrap}>
        <div style={S.barTrack}>
          <div style={{
            ...S.barFill,
            width: `${progress}%`,
            background: state === 'Failed'   ? '#ef4444' :
                        state === 'Paused'   ? '#f59e0b' :
                        state === 'Finished' ? '#22d3ee' :
                        'linear-gradient(90deg, #0ea5e9, #22d3ee)',
          }} />
        </div>
        <span style={S.pct}>{progress}%</span>
      </div>

      {message && (
        <div style={{ ...S.msg, ...(state === 'Failed' ? S.msgErr : state === 'Paused' ? S.msgWarn : {}) }}>
          {state === 'Processing' && <Pulse />}
          {message}
        </div>
      )}
    </div>
  );
};

const DoneIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const FailIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const ActiveDot = () => <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0f172a' }} />;
const Pulse     = () => <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#38bdf8', marginRight: 8, flexShrink: 0 }} />;

function circleStyle(s: Status): React.CSSProperties {
  if (s === 'done')   return { background: '#0ea5e9', color: '#fff' };
  if (s === 'active') return { background: '#0f172a', border: '2px solid #0ea5e9', color: '#0ea5e9', boxShadow: '0 0 12px rgba(14,165,233,.4)' };
  if (s === 'failed') return { background: '#ef4444', color: '#fff' };
  return { background: '#1e293b', border: '1px solid #334155', color: '#475569' };
}

const S: Record<string, React.CSSProperties> = {
  wrap:      { display: 'flex', flexDirection: 'column', gap: 16 },
  stepsRow:  { display: 'flex', alignItems: 'flex-start' },
  stepCol:   { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 6 },
  circle:    { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .3s', fontSize: 13, fontWeight: 600 },
  circleNum: { fontSize: 12, fontWeight: 600 },
  stepLabel: { fontSize: 11, fontWeight: 600, color: '#cbd5e1', textAlign: 'center' },
  stepSub:   { fontSize: 10, color: '#475569', textAlign: 'center' },
  line:      { flex: 1, height: 2, background: '#1e293b', marginTop: 17, transition: 'background .3s' },
  lineDone:  { background: '#0ea5e9' },
  barWrap:   { display: 'flex', alignItems: 'center', gap: 10 },
  barTrack:  { flex: 1, height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' },
  barFill:   { height: '100%', borderRadius: 3, transition: 'width .6s ease' },
  pct:       { fontSize: 12, color: '#64748b', minWidth: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  msg:       { fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '8px 12px', background: '#0f172a', borderRadius: 6, border: '1px solid #1e293b' },
  msgErr:    { color: '#fca5a5', borderColor: '#7f1d1d', background: '#1c0a0a' },
  msgWarn:   { color: '#fde68a', borderColor: '#78350f', background: '#1c1000' },
};
