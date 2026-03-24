import React, { useState, useEffect, useCallback } from 'react';
import { UploadZone }  from './components/UploadZone';
import { StepTracker } from './components/StepTracker';
import { VcfViewer }   from './components/VcfViewer';
import { JobCard }     from './components/JobCard';
import { usePolling }  from './hooks/usePolling';
import { uploadFile, getJobs, getJob, pauseJob, resumeJob } from './services/api';
import type { JobSummary, JobDetail } from './types';

export default function App() {
  const [jobs,      setJobs]      = useState<JobSummary[]>([]);
  const [activeId,  setActiveId]  = useState<string | null>(null);
  const [detail,    setDetail]    = useState<JobDetail | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actLoading,setActLoading]= useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [view,      setView]      = useState<'upload' | 'jobs'>('upload');

  const { data: progress, restart } = usePolling(activeId);

  // Progress yangilanganda jobs list ham yangilanadi
  useEffect(() => {
    if (!progress) return;
    setJobs(prev => prev.map(j => j.id === progress.id ? { ...j, ...progress } : j));
    if (progress.state === 'Finished') {
      getJob(progress.id).then(setDetail).catch(() => {});
    }
  }, [progress]);

  // Sahifa ochilganda tarix
  useEffect(() => { loadJobs(); }, []);

  const loadJobs = async () => {
    try { setJobs(await getJobs()); } catch {}
  };

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true); setError(null); setDetail(null);
    try {
      const { jobId } = await uploadFile(file);
      const stub: JobSummary = {
        id: jobId, fileName: file.name,
        state: 'Processing', currentStep: 'Uploading',
        progress: 0, stepMessage: 'Tayyorlanmoqda...',
        errorMessage: null, outputVcfKey: null,
        variantCount: 0, createdAt: new Date().toISOString(), finishedAt: null,
      };
      setJobs(prev => [stub, ...prev]);
      setActiveId(jobId);
      setView('jobs');
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message ?? 'Noma\'lum xato');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleSelect = useCallback(async (id: string) => {
    setActiveId(id); setDetail(null);
    try {
      const d = await getJob(id);
      setDetail(d);
    } catch {}
  }, []);

  const handlePause = useCallback(async () => {
    if (!activeId) return;
    setActLoading(true);
    try {
      await pauseJob(activeId);
      setJobs(prev => prev.map(j => j.id === activeId ? { ...j, state: 'Paused' } : j));
    } catch (e: any) { setError(e.response?.data?.error ?? 'To\'xtatib bo\'lmadi'); }
    finally { setActLoading(false); }
  }, [activeId]);

  const handleResume = useCallback(async () => {
    if (!activeId) return;
    setActLoading(true);
    try {
      await resumeJob(activeId);
      setJobs(prev => prev.map(j => j.id === activeId ? { ...j, state: 'Processing' } : j));
      restart();
    } catch (e: any) { setError(e.response?.data?.error ?? 'Davom ettirib bo\'lmadi'); }
    finally { setActLoading(false); }
  }, [activeId, restart]);

  // Active job — polling dan yoki detail dan
  const activeJob = jobs.find(j => j.id === activeId);
  const displayProgress = progress ?? (activeJob ? {
    id: activeJob.id, fileName: activeJob.fileName,
    state: activeJob.state, currentStep: activeJob.currentStep,
    progress: activeJob.progress, stepMessage: activeJob.stepMessage,
    errorMessage: activeJob.errorMessage, outputVcfKey: activeJob.outputVcfKey,
    variantCount: activeJob.variantCount,
  } : null);

  const isRunning = displayProgress?.state === 'Processing' || displayProgress?.state === 'Uploading';
  const isPaused  = displayProgress?.state === 'Paused';

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoMark}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <div>
            <div style={S.logoName}>BioPlusAI</div>
            <div style={S.logoSub}>DNK Tahlil Platformasi</div>
          </div>
        </div>

        <nav style={S.nav}>
          <button style={{ ...S.navBtn, ...(view === 'upload' ? S.navActive : {}) }} onClick={() => setView('upload')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            Fayl yuklash
          </button>
          <button style={{ ...S.navBtn, ...(view === 'jobs' ? S.navActive : {}) }} onClick={() => { setView('jobs'); loadJobs(); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Tarix
            {jobs.length > 0 && <span style={S.navCount}>{jobs.length}</span>}
          </button>
        </nav>

        {/* Job list */}
        {view === 'jobs' && (
          <div style={S.jobList}>
            {jobs.length === 0
              ? <div style={S.empty}>Hali hech qanday tahlil yo'q</div>
              : jobs.map(j => (
                  <JobCard
                    key={j.id}
                    job={j}
                    active={j.id === activeId}
                    onClick={() => handleSelect(j.id)}
                  />
                ))
            }
          </div>
        )}
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main style={S.main}>
        {/* Error */}
        {error && (
          <div style={S.errBanner}>
            <span>⚠ {error}</span>
            <button style={S.errClose} onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {view === 'upload' && (
          <div style={S.page}>
            <div style={S.pageHeader}>
              <h1 style={S.pageTitle}>DNK faylini tahlil qilish</h1>
              <p style={S.pageDesc}>
                BAM formatidagi fayl yuklang — DeepVariant yordamida variant qo'ng'iroqlari amalga oshiriladi
              </p>
            </div>
            <div style={S.uploadWrap}>
              <UploadZone onFile={handleUpload} loading={uploading} />
            </div>
          </div>
        )}

        {view === 'jobs' && !activeId && (
          <div style={S.emptyMain}>
            <div style={S.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="1">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div style={S.emptyText}>Chap paneldan job tanlang</div>
          </div>
        )}

        {view === 'jobs' && activeId && displayProgress && (
          <div style={S.detailPage}>
            {/* Job header */}
            <div style={S.detailHeader}>
              <div>
                <div style={S.detailTitle}>{displayProgress.fileName}</div>
                <div style={S.detailId}>ID: {activeId}</div>
              </div>
              <div style={S.actions}>
                {isRunning && (
                  <button style={{ ...S.actionBtn, ...S.pauseBtn }} onClick={handlePause} disabled={actLoading}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    To'xtatish
                  </button>
                )}
                {isPaused && (
                  <button style={{ ...S.actionBtn, ...S.resumeBtn }} onClick={handleResume} disabled={actLoading}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Davom ettirish
                  </button>
                )}
              </div>
            </div>

            {/* Step tracker */}
            <div style={S.card}>
              <StepTracker
                currentStep={displayProgress.currentStep}
                state={displayProgress.state}
                progress={displayProgress.progress}
                message={displayProgress.stepMessage}
              />
            </div>

            {/* VCF Viewer — faqat VCF tayyor bo'lganda */}
            {(displayProgress.outputVcfKey || detail?.outputVcfKey) && (
              <div style={S.card}>
                <div style={S.cardTitle}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  DeepVariant natijasi
                  {displayProgress.variantCount > 0 && (
                    <span style={S.varBadge}>{displayProgress.variantCount} variant</span>
                  )}
                </div>
                <VcfViewer
                  jobId={activeId}
                                  fileName={displayProgress.fileName}
                                  hasAmData={activeJob?.state === 'Finished'}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  root:         { display: 'flex', minHeight: '100vh', background: '#020c1b', fontFamily: '"IBM Plex Mono", "Fira Code", monospace', color: '#e2e8f0' },
  sidebar:      { width: 260, flexShrink: 0, background: '#030d1e', borderRight: '1px solid #0f1f35', display: 'flex', flexDirection: 'column', gap: 0 },
  logo:         { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 16px 16px', borderBottom: '1px solid #0f1f35' },
  logoMark:     { width: 36, height: 36, background: '#071d2e', border: '1px solid #0f3a56', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoName:     { fontSize: 14, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.05em' },
  logoSub:      { fontSize: 9, color: '#334155', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 1 },
  nav:          { display: 'flex', flexDirection: 'column', gap: 2, padding: '12px 8px' },
  navBtn:       { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, border: 'none', background: 'none', color: '#475569', cursor: 'pointer', fontSize: 12, fontWeight: 500, textAlign: 'left', transition: 'all .15s', fontFamily: 'inherit' },
  navActive:    { background: '#071d2e', color: '#38bdf8', border: '1px solid #0f3a56' },
  navCount:     { marginLeft: 'auto', background: '#0f3a56', color: '#38bdf8', borderRadius: 10, padding: '1px 6px', fontSize: 10 },
  jobList:      { flex: 1, overflowY: 'auto', padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 6 },
  empty:        { padding: 20, textAlign: 'center', color: '#1e293b', fontSize: 11 },
  main:         { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  errBanner:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: '#1c0a0a', borderBottom: '1px solid #7f1d1d', color: '#fca5a5', fontSize: 12 },
  errClose:     { background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 14 },
  page:         { maxWidth: 560, margin: '60px auto', padding: '0 24px', width: '100%' },
  pageHeader:   { marginBottom: 32 },
  pageTitle:    { fontSize: 22, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.02em', marginBottom: 8 },
  pageDesc:     { fontSize: 12, color: '#475569', lineHeight: 1.7 },
  uploadWrap:   {},
  emptyMain:    { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon:    {},
  emptyText:    { fontSize: 12, color: '#1e293b' },
  detailPage:   { padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 },
  detailHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  detailTitle:  { fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 },
  detailId:     { fontSize: 10, color: '#334155', fontFamily: 'monospace' },
  actions:      { display: 'flex', gap: 8, flexShrink: 0 },
  actionBtn:    { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', transition: 'all .15s' },
  pauseBtn:     { background: '#1c0a0a', borderColor: '#7f1d1d', color: '#fca5a5' },
  resumeBtn:    { background: '#071d2e', borderColor: '#0ea5e9', color: '#38bdf8' },
  card:         { background: '#0a1628', border: '1px solid #0f1f35', borderRadius: 10, padding: 20 },
  cardTitle:    { fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.08em' },
  varBadge:     { background: '#071d2e', border: '1px solid #0f3a56', color: '#22d3ee', borderRadius: 10, padding: '1px 8px', fontSize: 10, fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #020c1b; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #030d1e; }
  ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
  @keyframes spin  { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
`;
