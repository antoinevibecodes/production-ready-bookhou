import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'last_30', label: 'Last 30 Days' },
  { value: 'last_3m', label: 'Last 3 Months' },
  { value: 'last_6m', label: 'Last 6 Months' },
  { value: 'last_9m', label: 'Last 9 Months' },
  { value: 'last_12m', label: 'Last 12 Months' },
  { value: 'custom', label: 'Custom' },
];

const COMPARE_PRESETS = [
  { value: 'preceding', label: 'Preceding period' },
  { value: 'same_last_year', label: 'Same period last year' },
  { value: 'custom', label: 'Custom' },
];

function fmt(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

function computeDateRange(preset) {
  const today = new Date();
  switch (preset) {
    case 'today': return { start: fmt(today), end: fmt(today) };
    case 'this_week': {
      const mon = new Date(today);
      mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
      return { start: fmt(mon), end: fmt(today) };
    }
    case 'last_week': {
      const mon = new Date(today);
      mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7) - 7);
      const sun = new Date(mon);
      sun.setDate(sun.getDate() + 6);
      return { start: fmt(mon), end: fmt(sun) };
    }
    case 'last_30': { const d = new Date(today); d.setDate(d.getDate() - 30); return { start: fmt(d), end: fmt(today) }; }
    case 'last_3m': { const d = new Date(today); d.setMonth(d.getMonth() - 3); return { start: fmt(d), end: fmt(today) }; }
    case 'last_6m': { const d = new Date(today); d.setMonth(d.getMonth() - 6); return { start: fmt(d), end: fmt(today) }; }
    case 'last_9m': { const d = new Date(today); d.setMonth(d.getMonth() - 9); return { start: fmt(d), end: fmt(today) }; }
    case 'last_12m': { const d = new Date(today); d.setFullYear(d.getFullYear() - 1); return { start: fmt(d), end: fmt(today) }; }
    default: return { start: '', end: '' };
  }
}

function computeCompareRange(preset, start, end) {
  if (!start || !end) return { start: '', end: '' };
  const s = new Date(start);
  const e = new Date(end);
  const days = Math.round((e - s) / (1000 * 60 * 60 * 24));
  switch (preset) {
    case 'preceding': {
      const ce = new Date(s);
      ce.setDate(ce.getDate() - 1);
      const cs = new Date(ce);
      cs.setDate(cs.getDate() - days);
      return { start: fmt(cs), end: fmt(ce) };
    }
    case 'same_last_year': {
      const cs = new Date(s); cs.setFullYear(cs.getFullYear() - 1);
      const ce = new Date(e); ce.setFullYear(ce.getFullYear() - 1);
      return { start: fmt(cs), end: fmt(ce) };
    }
    default: return { start: '', end: '' };
  }
}

function calcChange(current, previous) {
  if (previous === 0 && current === 0) return { pct: '0', color: '#7c3aed' };
  if (previous === 0) return { pct: '+100', color: '#22c55e' };
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return {
    pct: (pct > 0 ? '+' : '') + pct.toFixed(2),
    color: pct > 0 ? '#22c55e' : pct < 0 ? '#ef4444' : '#7c3aed',
  };
}

export default function AnalyticsPage() {
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [datePreset, setDatePreset] = useState('this_week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comparePreset, setComparePreset] = useState('preceding');
  const [compareStartDate, setCompareStartDate] = useState('');
  const [compareEndDate, setCompareEndDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState({ totalParty: 'summary', tips: 'summary', parties: 'summary', addons: 'summary' });

  // Compute main date range on preset change
  useEffect(() => {
    if (datePreset !== 'custom') {
      const r = computeDateRange(datePreset);
      setStartDate(r.start);
      setEndDate(r.end);
    }
  }, [datePreset]);

  // Compute comparison range
  useEffect(() => {
    if (compareEnabled && comparePreset !== 'custom') {
      const r = computeCompareRange(comparePreset, startDate, endDate);
      setCompareStartDate(r.start);
      setCompareEndDate(r.end);
    }
  }, [compareEnabled, comparePreset, startDate, endDate]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (compareEnabled && compareStartDate && compareEndDate) {
        params.set('compareStartDate', compareStartDate);
        params.set('compareEndDate', compareEndDate);
      }
      const result = await api.get(`/reports/analytics?${params.toString()}`);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
    setLoading(false);
  }, [startDate, endDate, compareEnabled, compareStartDate, compareEndDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cur = data?.current;
  const cmp = data?.comparison;

  const ChangeBadge = ({ current, previous }) => {
    if (!compareEnabled || !cmp) return null;
    const { pct, color } = calcChange(current, previous);
    return <span style={{ fontSize: 12, fontWeight: 600, color, marginLeft: 4 }}>{pct}%</span>;
  };

  const CardHeader = ({ title, cardKey }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{title}</h3>
      <select
        style={{ padding: '5px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#64748b', background: '#fafbfc', cursor: 'pointer' }}
        value={viewMode[cardKey]}
        onChange={e => setViewMode(prev => ({ ...prev, [cardKey]: e.target.value }))}
      >
        <option value="summary">Summary</option>
        <option value="day_by_day">Day by Day</option>
      </select>
    </div>
  );

  const MetricItem = ({ label, value, prefix, compareValue }) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>
        {prefix}{value}
        <ChangeBadge current={typeof value === 'string' ? parseFloat(value) : value} previous={compareValue ?? 0} />
      </div>
    </div>
  );

  // Styles
  const st = {
    filterBar: {
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '16px 20px',
      background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 24,
    },
    filterLabel: { fontSize: 14, fontWeight: 600, color: '#7c3aed' },
    toggle: {
      position: 'relative', width: 42, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s',
    },
    toggleKnob: (on) => ({
      position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: '50%',
      background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    }),
    select: {
      padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b',
      background: '#fafbfc', cursor: 'pointer',
    },
    dateDisplay: { fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 },
    dateInput: { padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13 },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
    card: {
      background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '20px 24px',
    },
  };

  return (
    <div>
      {/* Filters */}
      <div style={st.filterBar}>
        <span style={st.filterLabel}>Filters</span>

        {/* Compare toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Compare</span>
          <div
            onClick={() => setCompareEnabled(v => !v)}
            style={{ ...st.toggle, background: compareEnabled ? '#22c55e' : '#cbd5e1' }}
          >
            <div style={st.toggleKnob(compareEnabled)} />
          </div>
        </div>

        {/* Date preset */}
        <select style={st.select} value={datePreset} onChange={e => setDatePreset(e.target.value)}>
          {DATE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        {/* Date range display */}
        <div style={st.dateDisplay}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {datePreset === 'custom' ? (
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="date" style={st.dateInput} value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span>to</span>
              <input type="date" style={st.dateInput} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </span>
          ) : (
            <span>{startDate} to {endDate}</span>
          )}
        </div>

        {/* Compare period (shown when toggle is on) */}
        {compareEnabled && (
          <>
            <select style={st.select} value={comparePreset} onChange={e => setComparePreset(e.target.value)}>
              {COMPARE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <div style={st.dateDisplay}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {comparePreset === 'custom' ? (
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="date" style={st.dateInput} value={compareStartDate} onChange={e => setCompareStartDate(e.target.value)} />
                  <span>to</span>
                  <input type="date" style={st.dateInput} value={compareEndDate} onChange={e => setCompareEndDate(e.target.value)} />
                </span>
              ) : (
                <span>{compareStartDate} to {compareEndDate}</span>
              )}
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading analytics...</div>
      ) : (
        <div style={st.grid}>
          {/* Total Party */}
          <div style={st.card}>
            <CardHeader title="Total Party" cardKey="totalParty" />
            <div style={{ display: 'flex', gap: 32 }}>
              <MetricItem label="By Business" value={cur?.parties?.byBusiness ?? 0} compareValue={cmp?.parties?.byBusiness} />
              <MetricItem label="By Client Page" value={cur?.parties?.byClientPage ?? 0} compareValue={cmp?.parties?.byClientPage} />
            </div>
          </div>

          {/* Tips Chart */}
          <div style={st.card}>
            <CardHeader title="Tips Chart" cardKey="tips" />
            <div style={{ display: 'flex', gap: 32 }}>
              <MetricItem label="Total" prefix="$ " value={((cur?.tips?.total ?? 0) / 100).toFixed(0)} compareValue={(cmp?.tips?.total ?? 0) / 100} />
              <MetricItem label="Average" prefix="$ " value={((cur?.tips?.average ?? 0) / 100).toFixed(2)} compareValue={(cmp?.tips?.average ?? 0) / 100} />
            </div>
          </div>

          {/* Parties Chart */}
          <div style={st.card}>
            <CardHeader title="Parties Chart" cardKey="parties" />
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {['requested', 'accepted', 'completed', 'cancelled', 'rejected'].map(key => (
                <MetricItem
                  key={key}
                  label={key.charAt(0).toUpperCase() + key.slice(1)}
                  value={cur?.parties?.[key] ?? 0}
                  compareValue={cmp?.parties?.[key]}
                />
              ))}
            </div>
          </div>

          {/* Addons Chart */}
          <div style={st.card}>
            <CardHeader title="Addons Chart" cardKey="addons" />
            <div style={{ display: 'flex', gap: 32 }}>
              <MetricItem label="Total" value={cur?.addons?.total ?? 0} compareValue={cmp?.addons?.total} />
              <MetricItem label="Online" value={cur?.addons?.online ?? 0} compareValue={cmp?.addons?.online} />
              <MetricItem label="In Person" value={cur?.addons?.inPerson ?? 0} compareValue={cmp?.addons?.inPerson} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
