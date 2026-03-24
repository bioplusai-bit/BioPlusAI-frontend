import React, { useEffect, useState } from 'react';
import { getVcfText, getVcfDownloadUrl } from '../services/api';

interface Props { jobId: string; fileName: string; }

export const VcfViewer: React.FC<Props> = ({ jobId, fileName }) => {
  const [text,     setText]     = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    getVcfText(jobId)
      .then(t => { setText(t); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [jobId]);

  const handleDownload = async () => {
    try {
      const url = await getVcfDownloadUrl(jobId);
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `${fileName.replace(/\.[^.]+$/, '')}_output.vcf`;
      a.click();
    } catch {}
  };

  // VCF ni parse qilib chiroyli ko'rsatamiz
  const lines = text ? text.split('\n') : [];
  const headerLines  = lines.filter(l => l.startsWith('##'));
  const columnLine   = lines.find(l => l.startsWith('#CHROM'));
  const dataLines    = lines.filter(l => l.trim() && !l.startsWith('#'));
  const columns      = columnLine ? columnLine.replace('#', '').split('\t') : [];

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.head}>
        <div style={S.headLeft}>
          <div style={S.fileIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div>
            <div style={S.vcfTitle}>output.vcf</div>
            <div style={S.vcfMeta}>
              {loading ? 'Yuklanmoqda...' : error ? 'Xato' : `${dataLines.length} variant · ${headerLines.length} header qator`}
            </div>
          </div>
        </div>
        <div style={S.headRight}>
          <button style={S.iconBtn} onClick={() => setExpanded(e => !e)} title={expanded ? 'Yig\'ish' : 'Kattaytirish'}>
            {expanded
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            }
          </button>
          <button style={S.downloadBtn} onClick={handleDownload}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Yuklab olish
          </button>
        </div>
      </div>

      {/* Content */}
      {loading && <div style={S.stateBox}>Yuklanmoqda...</div>}
      {error   && <div style={{ ...S.stateBox, color: '#fca5a5' }}>Xato: {error}</div>}

      {!loading && !error && text && (
        <div style={{ ...S.viewer, height: expanded ? 500 : 260 }}>
          {/* Parsed table view */}
          {columns.length > 0 && (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {columns.slice(0, 7).map(c => (
                      <th key={c} style={S.th}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataLines.slice(0, expanded ? 500 : 30).map((line, i) => {
                    const cells = line.split('\t');
                    return (
                      <tr key={i} style={i % 2 === 0 ? {} : S.trAlt}>
                        {cells.slice(0, 7).map((cell, j) => (
                          <td key={j} style={{
                            ...S.td,
                            ...(j === 0 ? S.tdChrom : {}),
                            ...(j === 3 ? S.tdRef   : {}),
                            ...(j === 4 ? S.tdAlt   : {}),
                          }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!expanded && dataLines.length > 30 && (
                <div style={S.more}>
                  ... va yana {dataLines.length - 30} ta variant
                  <button style={S.moreBtn} onClick={() => setExpanded(true)}>Barchasini ko'rish</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  wrap:        { background: '#0a1628', border: '1px solid #1e293b', borderRadius: 10, overflow: 'hidden' },
  head:        { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #1e293b', background: '#0f1f35' },
  headLeft:    { display: 'flex', alignItems: 'center', gap: 10 },
  headRight:   { display: 'flex', alignItems: 'center', gap: 8 },
  fileIcon:    { color: '#22d3ee' },
  vcfTitle:    { fontSize: 13, fontWeight: 600, color: '#e2e8f0', fontFamily: 'monospace' },
  vcfMeta:     { fontSize: 11, color: '#475569', marginTop: 1 },
  iconBtn:     { background: 'none', border: '1px solid #1e293b', borderRadius: 5, color: '#64748b', cursor: 'pointer', padding: '5px 7px', display: 'flex', alignItems: 'center' },
  downloadBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#0f3a56', border: '1px solid #0ea5e9', borderRadius: 5, color: '#38bdf8', fontSize: 11, cursor: 'pointer', fontWeight: 500 },
  stateBox:    { padding: 24, textAlign: 'center', color: '#475569', fontSize: 13 },
  viewer:      { overflow: 'auto', transition: 'height .3s ease' },
  tableWrap:   { minWidth: '100%' },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' },
  th:          { padding: '7px 12px', background: '#0d1f35', color: '#64748b', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #1e293b', whiteSpace: 'nowrap', position: 'sticky', top: 0 },
  td:          { padding: '5px 12px', color: '#94a3b8', borderBottom: '1px solid #0f1a2e', whiteSpace: 'nowrap' },
  trAlt:       { background: 'rgba(14,165,233,.03)' },
  tdChrom:     { color: '#7dd3fc', fontWeight: 600 },
  tdRef:       { color: '#86efac' },
  tdAlt:       { color: '#fca5a5' },
  more:        { padding: '10px 16px', fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid #0f1a2e' },
  moreBtn:     { background: 'none', border: '1px solid #334155', borderRadius: 4, color: '#64748b', cursor: 'pointer', fontSize: 11, padding: '3px 8px' },
};
