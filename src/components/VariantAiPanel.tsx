import React, { useState, useRef, useEffect } from 'react';
import type { VariantRow } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  variant: VariantRow | null;
  onClose: () => void;
}

function buildSystemPrompt(v: VariantRow): string {
  return `Sen genomika bo'yicha mutaxassis AI yordamchisisiz. Foydalanuvchi genomik variant haqida savol bermoqda.

Variant ma'lumotlari:
- Chromosoma: ${v.chromosome}
- Pozitsiya: ${v.position}
- Referens: ${v.ref} → Alternativ: ${v.alt}
${v.geneName ? `- Gen: ${v.geneName}` : ''}
${v.amScore != null ? `- AlphaMissense score: ${v.amScore} (${v.amClassification})` : '- AlphaMissense: ma\'lumot yo\'q'}
${v.hyenaPattern ? `- HyenaDNA pattern: ${v.hyenaPattern} (ishonch: ${((v.hyenaConfidence ?? 0) * 100).toFixed(0)}%)` : ''}
${v.hyenaAnnotation ? `- HyenaDNA annotatsiya: ${v.hyenaAnnotation}` : ''}
${v.proteinChange ? `- Oqsil o'zgarishi: ${v.proteinChange}` : ''}

Qoidalar:
1. O'zbek tilida javob ber
2. Tibbiy terminlarni oddiy tilda tushuntir
3. Qisqa va aniq bo'l (2-4 gap)
4. Klinik ahamiyatini ayt
5. Agar ma'lumot kam bo'lsa, shuni ayt`;
}

function buildInitialMessage(v: VariantRow): string {
  const parts = [];
  if (v.geneName) parts.push(`**${v.geneName}** genida`);
  parts.push(`${v.chromosome}:${v.position} pozitsiyasida`);
  parts.push(`${v.ref}→${v.alt} o'zgarish`);

  if (v.amClassification && v.amClassification !== 'unknown') {
    parts.push(`AlphaMissense: **${v.amClassification}** (${v.amScore?.toFixed(3)})`);
  }
  if (v.hyenaPattern && v.hyenaPattern !== 'UNKNOWN') {
    parts.push(`HyenaDNA: **${v.hyenaPattern}**`);
  }

  return `Bu variant haqida tushuntiring:\n${parts.join(', ')}`;
}

export const VariantAiPanel: React.FC<Props> = ({ variant, onClose }) => {
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Panel ochilganda animatsiya
  useEffect(() => {
    if (variant) {
      setIsVisible(false);
      setTimeout(() => setIsVisible(true), 10);
      setMessages([]);
      setInput('');
      // Avtomatik birinchi savol yuborish
      setTimeout(() => sendInitialMessage(variant), 300);
    }
  }, [variant]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendInitialMessage = async (v: VariantRow) => {
    const userMsg = buildInitialMessage(v);
    await callApi(userMsg, [], v);
  };

  const callApi = async (userText: string, history: Message[], v: VariantRow) => {
    setLoading(true);
    const newMessages: Message[] = [...history, { role: 'user', content: userText }];
    setMessages(newMessages);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: buildSystemPrompt(v),
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      const text = data.content?.map((c: any) => c.text || '').join('') || 'Javob olishda xato';

      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'API ga ulanishda xato yuz berdi.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !variant) return;
    const text = input.trim();
    setInput('');
    await callApi(text, messages, variant);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const SUGGESTIONS = [
    'Klinik ahamiyati nima?',
    'Davolash mumkinmi?',
    'Ota-onadan meros qolishi mumkinmi?',
    'Boshqa genlar bilan bog\'liqmi?',
  ];

  if (!variant) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={{ ...S.backdrop, opacity: isVisible ? 1 : 0 }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        ...S.panel,
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        opacity: isVisible ? 1 : 0,
      }}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.headerLeft}>
            <div style={S.aiDot} />
            <div>
              <div style={S.headerTitle}>AI Tahlil</div>
              <div style={S.headerSub}>
                {variant.geneName
                  ? <><span style={S.geneTag}>{variant.geneName}</span> · {variant.chromosome}:{variant.position}</>
                  : `${variant.chromosome}:${variant.position}`
                }
              </div>
            </div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Variant summary */}
        <div style={S.variantSummary}>
          <span style={S.summaryItem}>
            <span style={S.refBase}>{variant.ref}</span>
            <span style={{ color: '#475569', margin: '0 4px' }}>→</span>
            <span style={S.altBase}>{variant.alt}</span>
          </span>
          {variant.amClassification && variant.amClassification !== 'unknown' && (
            <span style={{ ...S.summaryBadge, ...amColor(variant.amClassification) }}>
              {variant.amClassification}
            </span>
          )}
          {variant.hyenaPattern && variant.hyenaPattern !== 'UNKNOWN' && (
            <span style={{ ...S.summaryBadge, ...hyenaColor(variant.hyenaPattern) }}>
              {variant.hyenaPattern}
            </span>
          )}
        </div>

        {/* Messages */}
        <div style={S.messages}>
          {messages.map((m, i) => (
            <div key={i} style={{ ...S.msgWrap, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'assistant' && <div style={S.aiAvatar}>🧬</div>}
              <div style={{
                ...S.bubble,
                ...(m.role === 'user' ? S.bubbleUser : S.bubbleAi),
              }}>
                {m.content.split('\n').map((line, j) => (
                  <span key={j}>
                    {line.split(/(\*\*[^*]+\*\*)/).map((part, k) =>
                      part.startsWith('**') && part.endsWith('**')
                        ? <strong key={k} style={{ color: '#e2e8f0' }}>{part.slice(2, -2)}</strong>
                        : part
                    )}
                    {j < m.content.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ ...S.msgWrap, justifyContent: 'flex-start' }}>
              <div style={S.aiAvatar}>🧬</div>
              <div style={{ ...S.bubble, ...S.bubbleAi }}>
                <div style={S.typing}>
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length > 0 && !loading && (
          <div style={S.suggestions}>
            {SUGGESTIONS.map(s => (
              <button key={s} style={S.suggBtn}
                onClick={() => { setInput(s); setTimeout(() => handleSend(), 0); }}>
                {s}
              </button>
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
            onKeyDown={handleKeyDown}
            placeholder="Savol bering..."
            disabled={loading}
          />
          <button
            style={{ ...S.sendBtn, opacity: input.trim() && !loading ? 1 : 0.4 }}
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 80%, 100% { opacity: 0; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
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
  if (p === 'CODING')      return { background: 'rgba(56,189,248,.2)',  color: '#7dd3fc', border: '1px solid rgba(56,189,248,.3)' };
  return { background: 'rgba(100,116,139,.2)', color: '#94a3b8', border: '1px solid rgba(100,116,139,.3)' };
}

const S: Record<string, React.CSSProperties> = {
  backdrop:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 999, transition: 'opacity .25s', cursor: 'pointer' },
  panel:         { position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, background: '#060f1e', borderLeft: '1px solid #1e293b', zIndex: 1000, display: 'flex', flexDirection: 'column', transition: 'transform .3s cubic-bezier(.4,0,.2,1), opacity .3s', boxShadow: '-20px 0 60px rgba(0,0,0,.5)' },
  header:        { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1e293b', background: '#0a1628' },
  headerLeft:    { display: 'flex', alignItems: 'center', gap: 10 },
  aiDot:         { width: 8, height: 8, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 8px #22d3ee', flexShrink: 0, animation: 'blink 2s ease-in-out infinite' },
  headerTitle:   { fontSize: 13, fontWeight: 700, color: '#e2e8f0', letterSpacing: '.02em' },
  headerSub:     { fontSize: 11, color: '#475569', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 },
  geneTag:       { color: '#818cf8', fontWeight: 600 },
  closeBtn:      { background: 'none', border: '1px solid #1e293b', borderRadius: 6, color: '#64748b', cursor: 'pointer', padding: '6px 7px', display: 'flex', alignItems: 'center', transition: 'all .15s' },
  variantSummary:{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderBottom: '1px solid #0f1a2e', flexWrap: 'wrap' },
  summaryItem:   { display: 'flex', alignItems: 'center', fontFamily: 'monospace', fontSize: 13 },
  refBase:       { color: '#86efac', fontWeight: 700 },
  altBase:       { color: '#fca5a5', fontWeight: 700 },
  summaryBadge:  { fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10 },
  messages:      { flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  msgWrap:       { display: 'flex', alignItems: 'flex-end', gap: 8 },
  aiAvatar:      { fontSize: 16, flexShrink: 0, marginBottom: 2 },
  bubble:        { maxWidth: '85%', padding: '10px 14px', borderRadius: 12, fontSize: 12, lineHeight: 1.6 },
  bubbleAi:      { background: '#0f1f35', border: '1px solid #1e293b', color: '#94a3b8', borderBottomLeftRadius: 4 },
  bubbleUser:    { background: '#0c3b5e', border: '1px solid #1e4976', color: '#bae6fd', borderBottomRightRadius: 4 },
  typing:        { display: 'flex', gap: 4, alignItems: 'center', padding: '2px 0' },
  suggestions:   { display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 20px', borderTop: '1px solid #0f1a2e' },
  suggBtn:       { fontSize: 10, padding: '4px 10px', background: '#0f1f35', border: '1px solid #1e293b', borderRadius: 12, color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s' },
  inputWrap:     { display: 'flex', gap: 8, padding: '12px 20px', borderTop: '1px solid #1e293b', background: '#0a1628' },
  input:         { flex: 1, background: '#0f1f35', border: '1px solid #1e293b', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none', fontFamily: 'inherit' },
  sendBtn:       { background: '#0c3b5e', border: '1px solid #1e4976', borderRadius: 8, color: '#38bdf8', cursor: 'pointer', padding: '8px 10px', display: 'flex', alignItems: 'center', transition: 'all .15s' },
};
