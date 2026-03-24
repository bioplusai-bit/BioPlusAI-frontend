import React, { useEffect, useState } from 'react';
import { getVcfText, getVcfDownloadUrl, getJob } from '../services/api';
import type { VariantRow } from '../types';

interface Props { jobId: string; fileName: string; hasAmData?: boolean; }

const CLASS_STYLE: Record<string, React.CSSProperties> = {
    PATHOGENIC: { background: 'rgba(239,68,68,.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,.3)' },
    BENIGN: { background: 'rgba(34,197,94,.15)', color: '#86efac', border: '1px solid rgba(34,197,94,.3)' },
    AMBIGUOUS: { background: 'rgba(245,158,11,.15)', color: '#fde68a', border: '1px solid rgba(245,158,11,.3)' },
    unknown: { background: 'rgba(100,116,139,.15)', color: '#94a3b8', border: '1px solid rgba(100,116,139,.3)' },
};

export const VcfViewer: React.FC<Props> = ({ jobId, fileName, hasAmData }) => {
    const [variants, setVariants] = useState<VariantRow[] | null>(null);
    const [vcfText, setVcfText] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'table' | 'vcf'>('table');

    useEffect(() => {
        setLoading(true);
        Promise.all([
            getJob(jobId).then(j => setVariants(j.variants ?? [])).catch(() => { }),
            getVcfText(jobId).then(setVcfText).catch(() => { }),
        ]).finally(() => setLoading(false));
    }, [jobId]);

    const handleDownload = async () => {
        try {
            const url = await getVcfDownloadUrl(jobId);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName.replace(/\.[^.]+$/, '')}_output.vcf`;
            a.click();
        } catch { }
    };

    const pathCount = variants?.filter(v => v.amClassification === 'PATHOGENIC').length ?? 0;
    const benignCount = variants?.filter(v => v.amClassification === 'BENIGN').length ?? 0;
    const ambigCount = variants?.filter(v => v.amClassification === 'AMBIGUOUS').length ?? 0;

    return (
        <div style={S.wrap}>
            {/* Header */}
            <div style={S.head}>
                <div style={S.headLeft}>
                    <div style={S.fileIcon}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                    </div>
                    <div>
                        <div style={S.vcfTitle}>output.vcf</div>
                        <div style={S.vcfMeta}>
                            {loading ? 'Yuklanmoqda...' : `${variants?.length ?? 0} variant`}
                        </div>
                    </div>
                </div>
                <div style={S.headRight}>
                    {/* Stats badges */}
                    {!loading && hasAmData && variants && variants.length > 0 && (
                        <div style={S.stats}>
                            {pathCount > 0 && <span style={{ ...S.statBadge, ...CLASS_STYLE.PATHOGENIC }}>{pathCount} PATHOGENIC</span>}
                            {ambigCount > 0 && <span style={{ ...S.statBadge, ...CLASS_STYLE.AMBIGUOUS }}>{ambigCount} AMBIGUOUS</span>}
                            {benignCount > 0 && <span style={{ ...S.statBadge, ...CLASS_STYLE.BENIGN }}>{benignCount} BENIGN</span>}
                        </div>
                    )}
                    <button style={S.iconBtn} onClick={() => setExpanded(e => !e)}>
                        {expanded
                            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="10" y1="14" x2="3" y2="21" /><line x1="21" y1="3" x2="14" y2="10" /></svg>
                            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                        }
                    </button>
                    <button style={S.downloadBtn} onClick={handleDownload}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        VCF yuklab olish
                    </button>
                </div>
            </div>

            {/* Tabs */}
            {!loading && !error && (
                <div style={S.tabs}>
                    <button
                        style={{ ...S.tab, ...(activeTab === 'table' ? S.tabActive : {}) }}
                        onClick={() => setActiveTab('table')}
                    >
                        📊 Jadval
                    </button>
                    <button
                        style={{ ...S.tab, ...(activeTab === 'vcf' ? S.tabActive : {}) }}
                        onClick={() => setActiveTab('vcf')}
                    >
                        📄 VCF fayl
                    </button>
                </div>
            )}

            {loading && <div style={S.stateBox}>Yuklanmoqda...</div>}
            {error && <div style={{ ...S.stateBox, color: '#fca5a5' }}>Xato: {error}</div>}

            {/* Table view */}
            {!loading && activeTab === 'table' && variants && (
                <div style={{ ...S.viewer, height: expanded ? 600 : 300 }}>
                    <table style={S.table}>
                        <thead>
                            <tr>
                                <th style={S.th}>Chr</th>
                                <th style={S.th}>Pozitsiya</th>
                                <th style={S.th}>Ref → Alt</th>
                                <th style={S.th}>Gen</th>
                                {hasAmData && <th style={S.th}>AM Score</th>}
                                {hasAmData && <th style={S.th}>Klassifikatsiya</th>}
                                {hasAmData && <th style={S.th}>Protein</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {variants.slice(0, expanded ? 1000 : 50).map((v, i) => (
                                <tr key={v.id} style={i % 2 === 0 ? {} : S.trAlt}>
                                    <td style={{ ...S.td, ...S.tdChrom }}>{v.chromosome}</td>
                                    <td style={{ ...S.td, fontFamily: 'monospace' }}>{v.position.toLocaleString()}</td>
                                    <td style={S.td}>
                                        <span style={S.tdRef}>{v.ref}</span>
                                        <span style={{ color: '#475569' }}> → </span>
                                        <span style={S.tdAlt}>{v.alt}</span>
                                    </td>
                                    <td style={S.td}>
                                        {v.geneName
                                            ? <span style={S.gene}>{v.geneName}</span>
                                            : <span style={S.na}>—</span>}
                                    </td>
                                    {hasAmData && (
                                        <td style={{ ...S.td, textAlign: 'center', fontFamily: 'monospace' }}>
                                            {v.amScore != null ? v.amScore.toFixed(3) : <span style={S.na}>—</span>}
                                        </td>
                                    )}
                                    {hasAmData && (
                                        <td style={S.td}>
                                            {v.amClassification ? (
                                                <span style={{ ...S.classBadge, ...(CLASS_STYLE[v.amClassification] ?? CLASS_STYLE.unknown) }}>
                                                    {v.amClassification}
                                                </span>
                                            ) : <span style={S.na}>—</span>}
                                        </td>
                                    )}
                                    {hasAmData && (
                                        <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 10, color: '#64748b' }}>
                                            {v.proteinChange ?? <span style={S.na}>—</span>}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!expanded && variants.length > 50 && (
                        <div style={S.more}>
                            ... va yana {variants.length - 50} ta variant
                            <button style={S.moreBtn} onClick={() => setExpanded(true)}>Barchasini ko'rish</button>
                        </div>
                    )}
                </div>
            )}

            {/* VCF raw view */}
            {!loading && activeTab === 'vcf' && vcfText && (
                <div style={{ ...S.viewer, height: expanded ? 500 : 260, fontFamily: 'monospace', fontSize: 11, padding: '12px 16px', color: '#94a3b8', overflowX: 'auto', whiteSpace: 'pre' }}>
                    {vcfText.split('\n').slice(0, expanded ? 1000 : 50).map((line, i) => (
                        <div key={i} style={{ color: line.startsWith('#') ? '#475569' : '#94a3b8' }}>
                            {line}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const S: Record<string, React.CSSProperties> = {
    wrap: { background: '#0a1628', border: '1px solid #1e293b', borderRadius: 10, overflow: 'hidden' },
    head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #1e293b', background: '#0f1f35', flexWrap: 'wrap', gap: 8 },
    headLeft: { display: 'flex', alignItems: 'center', gap: 10 },
    headRight: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    fileIcon: { color: '#22d3ee' },
    vcfTitle: { fontSize: 13, fontWeight: 600, color: '#e2e8f0', fontFamily: 'monospace' },
    vcfMeta: { fontSize: 11, color: '#475569', marginTop: 1 },
    stats: { display: 'flex', gap: 6, flexWrap: 'wrap' },
    statBadge: { fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10 },
    iconBtn: { background: 'none', border: '1px solid #1e293b', borderRadius: 5, color: '#64748b', cursor: 'pointer', padding: '5px 7px', display: 'flex', alignItems: 'center' },
    downloadBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#0f3a56', border: '1px solid #0ea5e9', borderRadius: 5, color: '#38bdf8', fontSize: 11, cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' },
    tabs: { display: 'flex', borderBottom: '1px solid #1e293b' },
    tab: { padding: '8px 16px', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' },
    tabActive: { color: '#38bdf8', borderBottom: '2px solid #0ea5e9' },
    stateBox: { padding: 24, textAlign: 'center', color: '#475569', fontSize: 13 },
    viewer: { overflow: 'auto', transition: 'height .3s ease' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
    th: { padding: '7px 12px', background: '#0d1f35', color: '#64748b', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #1e293b', whiteSpace: 'nowrap', position: 'sticky', top: 0 },
    td: { padding: '6px 12px', borderBottom: '1px solid #0f1a2e', whiteSpace: 'nowrap' },
    trAlt: { background: 'rgba(14,165,233,.03)' },
    tdChrom: { color: '#7dd3fc', fontWeight: 600, fontFamily: 'monospace' },
    tdRef: { color: '#86efac', fontFamily: 'monospace' },
    tdAlt: { color: '#fca5a5', fontFamily: 'monospace' },
    gene: { color: '#818cf8', fontWeight: 600 },
    classBadge: { padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' },
    na: { color: '#1e293b' },
    more: { padding: '10px 16px', fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid #0f1a2e' },
    moreBtn: { background: 'none', border: '1px solid #334155', borderRadius: 4, color: '#64748b', cursor: 'pointer', fontSize: 11, padding: '3px 8px' },
};
