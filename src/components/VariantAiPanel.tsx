import React, { useState, useRef, useEffect } from 'react';
import type { VariantRow } from '../types';
import { t, useLang } from '../i18n';

const API_BASE = process.env.REACT_APP_API_URL || 'https://bioplusaiv1-production.up.railway.app';

interface Message { role: 'user' | 'assistant'; content: string; }
interface Props { variant: VariantRow | null; onClose: () => void; }

function buildSystemPrompt(v: VariantRow): string {
  return `${t('aiSystem')}

Variant data:
- Chromosome: ${v.chromosome}, Position: ${v.position}
- Change: ${v.ref} → ${v.alt}
${v.geneName ? `- Gene: ${v.geneName}` : ''}
${v.amScore != null ? `- AlphaMissense: ${v.amScore} (${v.amClassification})` : '- AlphaMissense: no data'}
${v.hyenaPattern ? `- HyenaDNA pattern: ${v.hyenaPattern} (${((v.hyenaConfidence ?? 0) * 100).toFixed(0)}% confidence)` : ''}
${v.hyenaAnnotation ? `- Annotation: ${v.hyenaAnnotation}` : ''}

${t('aiRules')}`;
}

function buildInitialMessage(v: VariantRow): string {
  const parts: string[] = [];
  if (v.geneName) parts.push(`**${v.geneName}**`);
  parts.push(`${v.chromosome}:${v.position} ${v.ref}→${v.alt}`);
  if (v.amClassification && v.amClassification !== 'unknown')
    parts.push(`AlphaMissense: **${v.amClassification}** (${v.amScore?.toFixed(3)})`);
  if (v.hyenaPattern && v.hyenaPattern !== 'UNKNOWN')
    parts.push(`HyenaDNA: **${v.hyenaPattern}**`);
  return `${t('aiExplain')} ${parts.join(', ')}`;
}

export const VariantAiPanel: React.FC<Props> = ({ variant, onClose }) => {
  useLang(); // re-render on lang change
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const variantRef = useRef<VariantRow | null>(null);

  useEffect(() => {
    if (variant && variant.id !== variantRef.current?.id) {
      variantRef.current = variant;
      setIsVisible(false);
      setMessages([]);
      setInput('');
      setTimeout(() => setIsVisible(true), 10);
      const msg = buildInitialMessage(variant);
      setTimeout(() => sendMessageInternal(msg, [], variant), 300);
    }
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessageInternal = async (text: string, history: Message[], v: VariantRow) => {
    setLoading(true);
    const newHistory: Message[] = [...history, { role: 'user', content: text }];
    setMessages(newHistory);

    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: buildSystemPrompt(v), messages: newHistory }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'API error');
      setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `${t('aiError')} ${err.message}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSend = () => {
    if (!input.trim() || loading || !variant) return;
    const text = input.trim();
    setInput('');
    sendMessageInternal(text, messages, variant);
  };

  const SUGGESTIONS = [
    t('sugClinical'),
    t('sugTreatment'),
    t('sugHereditary'),
    t('sugGenes'),
  ];

  if (!variant) return null;

  return (
    <>
      <div style={{ ...S.backdrop, opacity: isVisible ? 1 : 0 }} onClick={onClose} />
      <div style={{ ...S.panel, transform: isVisible ? 'translateX(0)' : 'translateX(100%)', opacity: isVisible ? 1 : 0 }}>

        {/* Header */}
        <div style={S.header}>
          <div style={S.headerLeft}>
            <div style={S.aiDot} />
            <div>
              <div style={S.headerTitle}>{t('aiTitle')}</div>
              <div style={S.headerSub}>
                {variant.geneName
                  ? <><span style={{ color: '#818cf8', fontWeight: 600 }}>{variant.geneName}</span> · {variant.chromosome}:{variant.position}</>
                  : `${variant.chromosome}:${variant.position}`}
              </div>
            </div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Variant badge */}
        <div style={S.variantBar}>
          <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
            <span style={{ color: '#86efac', fontWeight: 700 }}>{variant.ref}</span>
            <span style={{ color: '#475569', margin: '0 4px' }}>→</span>
            <span style={{ color: '#fca5a5', fontWeight: 700 }}>{variant.alt}</span>
          </span>
          {variant.amClassification && variant.amClassification !== 'unknown' && (
            <span style={{ ...S.badge, ...amColor(variant.amClassification) }}>{variant.amClassification}</span>
          )}
          {variant.hyenaPattern && variant.hyenaPattern !== 'UNKNOWN' && (
            <span style={{ ...S.badge, ...hyenaColor(variant.hyenaPattern) }}>{variant.hyenaPattern}</span>
          )}
        </div>

        {/* Messages */}
        <div style={S.messages}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
              {m.role === 'assistant' && <span style={{ fontSize: 16, flexShrink: 0 }}>🧬</span>}
              <div style={{ ...S.bubble, ...(m.role === 'user' ? S.bubbleUser : S.bubbleAi) }}>
                {m.content.split('\n').map((line, j) => (
                  <span key={j}>
                    {line.split(/(\*\*[^*]+\*\*)/).map((p, k) =>
                      p.startsWith('**') && p.endsWith('**')
                        ? <strong key={k} style={{ color: '#e2e8f0' }}>{p.slice(2, -2)}</strong>
                        : p
                    )}
                    {j < m.content.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🧬</span>
              <div style={{ ...S.bubble, ...S.bubbleAi }}>
                <div style={S.typing}><span /><span /><span /></div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length > 1 && !loading && (
          <div style={S.suggestions}>
            {SUGGESTIONS.map(s => (
              <button key={s} style={S.suggBtn} onClick={() => {
                if (!variant) return;
                sendMessageInternal(s, messages, variant);
              }}>{s}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={S.inputWrap}>
          <input
            ref={inputRef}
            style={S.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={t('aiPlaceholder')}
            disabled={loading}
          />
          <button
            style={{ ...S.sendBtn, opacity: input.trim() && !loading ? 1 : 0.4 }}
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

function amColor(c: string): React.CSSProperties {
  if (c === 'PATHOGENIC') return { background: 'rgba(239,68,68,.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,.3)' };
  if (c === 'BENIGN')     return { background: 'rgba(34,197,94,.2)',  color: '#86efac', border: '1px solid rgba(34,197,94,.3)' };
  return { background: 'rgba(245,158,11,.2)', color: '#fde68a', border: '1px solid rgba(245,158,11,.3)' };
}
function hyenaColor(p: string): React.CSSProperties {
  if (p === 'SPLICE_SITE') return { background: 'rgba(167,139,250,.2)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,.3)' };
  if (p === 'REGULATORY')  return { background: 'rgba(251,191,36,.2)',  color: '#fde68a', border: '1px solid rgba(251,191,36,.3)' };
  return { background: 'rgba(56,189,248,.2)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,.3)' };
}

const S: Record<string, React.CSSProperties> = {
  backdrop:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 999, transition: 'opacity .25s', cursor: 'pointer' },
  panel:       { position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, background: '#060f1e', borderLeft: '1px solid #1e293b', zIndex: 1000, display: 'flex', flexDirection: 'column', transition: 'transform .3s cubic-bezier(.4,0,.2,1), opacity .3s', boxShadow: '-20px 0 60px rgba(0,0,0,.6)' },
  header:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1e293b', background: '#0a1628' },
  headerLeft:  { display: 'flex', alignItems: 'center', gap: 10 },
  aiDot:       { width: 8, height: 8, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 8px #22d3ee', flexShrink: 0 },
  headerTitle: { fontSize: 13, fontWeight: 700, color: '#e2e8f0' },
  headerSub:   { fontSize: 11, color: '#475569', marginTop: 2 },
  closeBtn:    { background: 'none', border: '1px solid #1e293b', borderRadius: 6, color: '#64748b', cursor: 'pointer', padding: '6px 10px', fontSize: 12 },
  variantBar:  { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderBottom: '1px solid #0f1a2e', flexWrap: 'wrap' },
  badge:       { fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' },
  messages:    { flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  bubble:      { maxWidth: '85%', padding: '10px 14px', borderRadius: 12, fontSize: 12, lineHeight: 1.6 },
  bubbleAi:    { background: '#0f1f35', border: '1px solid #1e293b', color: '#94a3b8', borderBottomLeftRadius: 4 },
  bubbleUser:  { background: '#0c3b5e', border: '1px solid #1e4976', color: '#bae6fd', borderBottomRightRadius: 4 },
  typing:      { display: 'flex', gap: 4, alignItems: 'center', padding: '2px 0' },
  suggestions: { display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 20px', borderTop: '1px solid #0f1a2e' },
  suggBtn:     { fontSize: 10, padding: '4px 10px', background: '#0f1f35', border: '1px solid #1e293b', borderRadius: 12, color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' },
  inputWrap:   { display: 'flex', gap: 8, padding: '12px 20px', borderTop: '1px solid #1e293b', background: '#0a1628' },
  input:       { flex: 1, background: '#0f1f35', border: '1px solid #1e293b', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none', fontFamily: 'inherit' },
  sendBtn:     { background: '#0c3b5e', border: '1px solid #1e4976', borderRadius: 8, color: '#38bdf8', cursor: 'pointer', padding: '8px 10px', display: 'flex', alignItems: 'center', transition: 'all .15s' },
};
