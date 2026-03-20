import React, { useState, useEffect } from 'react';

const TRIGGER_OPTIONS = [
  { value: 'EVENT_CREATE', label: 'Event Create' },
  { value: 'RSVP_CONFIRMATION', label: 'RSVP Confirmation' },
  { value: 'RSVP_DECLINED', label: 'RSVP Declined' },
  { value: 'GUEST_INVITATION', label: 'Guest Invitation [After Is Booked]' },
  { value: 'EVENT_CANCELLATION_HOST', label: 'Event Cancellation To Host' },
  { value: 'EVENT_CANCELLATION_GUEST', label: 'Event Cancellation To Guest' },
  { value: 'PAYMENT_MADE', label: 'When a customer makes a payment' },
  { value: 'REFUND_ISSUED', label: 'When a refund is issued' },
  { value: 'REVIEW_POST_PARTY', label: 'Review Email [Post Party]' },
  { value: 'WAIVER_REMINDER', label: 'Waiver Reminder Email' },
  { value: 'WAIVER_CONFIRMATION', label: 'Waiver Confirmation Email' },
  { value: 'ABANDONED_CART_24H', label: 'Abandoned Cart [24 Hours]' },
  { value: 'ABANDONED_CART_2H', label: 'Abandoned Cart [2 Hours]' },
  { value: 'UPSELL_72H', label: 'Upsell Before Booked Time [72 Hours]' },
  { value: 'TEAM_MEMBER_ASSIGNED', label: 'Team member assigned to an event' },
  { value: 'TEAM_MEMBER_REMOVED', label: 'A team member has been removed from an event' },
  { value: 'NEW_TEAM_MEMBER', label: 'New Team Member' },
  { value: 'BOOKING_REJECTED', label: 'When a booking is rejected' },
  { value: 'EVENT_DATE', label: 'Event Date' },
  { value: 'CUSTOM', label: 'Custom' },
];

const SEND_TO_OPTIONS = [
  { value: 'host', label: 'Host' },
  { value: 'guest', label: 'Guest' },
  { value: 'team_member', label: 'Team Member' },
];

export default function EmailAutomationPage() {
  const [automations, setAutomations] = useState([]);
  const [view, setView] = useState('list'); // list, create, edit
  const [editingId, setEditingId] = useState(null);
  const [searchDefault, setSearchDefault] = useState('');
  const [searchCustom, setSearchCustom] = useState('');
  const [entriesDefault, setEntriesDefault] = useState(10);
  const [entriesCustom, setEntriesCustom] = useState(10);
  const [pageDefault, setPageDefault] = useState(1);
  const [pageCustom, setPageCustom] = useState(1);
  const [showFooterModal, setShowFooterModal] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [missionText, setMissionText] = useState('');
  const [footerBgColor, setFooterBgColor] = useState('#c46a2b');
  const [footerContent, setFooterContent] = useState('[BUSINESS_NAME]\n[BUSINESS_EMAIL]\n[BUSINESS_NUMBER]');

  // Form state for create/edit
  const [form, setForm] = useState({
    subject: '',
    trigger: 'EVENT_DATE',
    triggerLabel: '',
    body: '',
    sendTo: 'host',
    action: 'after',
    timeMins: 60,
    timeUnit: 'Minutes',
  });

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchAutomations = async () => {
    try {
      const res = await fetch('/api/email-automations', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAutomations(data);
      }
    } catch (err) {
      console.error('Failed to fetch automations:', err);
    }
  };

  const toggleAutomation = async (id) => {
    try {
      const res = await fetch(`/api/email-automations/${id}/toggle`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (res.ok) {
        const updated = await res.json();
        setAutomations(prev => prev.map(a => a.id === id ? updated : a));
      }
    } catch (err) {
      console.error('Failed to toggle:', err);
    }
  };

  const deleteAutomation = async (id) => {
    if (!confirm('Delete this custom email automation?')) return;
    try {
      const res = await fetch(`/api/email-automations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setAutomations(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleCreate = async () => {
    const timeMins = form.timeUnit === 'Hours' ? form.timeMins * 60 : form.timeMins;
    try {
      const res = await fetch('/api/email-automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject: form.subject,
          trigger: form.trigger,
          triggerLabel: TRIGGER_OPTIONS.find(t => t.value === form.trigger)?.label || form.trigger,
          body: form.body,
          sendTo: form.sendTo,
          action: form.action,
          timeMins,
        }),
      });
      if (res.ok) {
        await fetchAutomations();
        setView('list');
        resetForm();
      }
    } catch (err) {
      console.error('Failed to create:', err);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/email-automations/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject: form.subject,
          body: form.body,
        }),
      });
      if (res.ok) {
        await fetchAutomations();
        setView('list');
        resetForm();
      }
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  const startEdit = (automation) => {
    setForm({
      subject: automation.subject,
      trigger: automation.trigger,
      triggerLabel: automation.triggerLabel,
      body: automation.body || '',
      sendTo: automation.sendTo || 'host',
      action: automation.action || 'after',
      timeMins: automation.timeMins || 0,
      timeUnit: 'Minutes',
    });
    setEditingId(automation.id);
    setView('edit');
  };

  const resetForm = () => {
    setForm({ subject: '', trigger: 'EVENT_DATE', triggerLabel: '', body: '', sendTo: 'host', action: 'after', timeMins: 60, timeUnit: 'Minutes' });
    setEditingId(null);
  };

  const defaultEmails = automations.filter(a => a.isDefault);
  const customEmails = automations.filter(a => !a.isDefault);

  // Filter and paginate defaults
  const filteredDefaults = defaultEmails.filter(a =>
    a.subject.toLowerCase().includes(searchDefault.toLowerCase()) ||
    a.triggerLabel.toLowerCase().includes(searchDefault.toLowerCase())
  );
  const totalDefaultPages = Math.ceil(filteredDefaults.length / entriesDefault);
  const pagedDefaults = filteredDefaults.slice((pageDefault - 1) * entriesDefault, pageDefault * entriesDefault);

  // Filter and paginate customs
  const filteredCustoms = customEmails.filter(a =>
    a.subject.toLowerCase().includes(searchCustom.toLowerCase()) ||
    a.triggerLabel.toLowerCase().includes(searchCustom.toLowerCase())
  );
  const totalCustomPages = Math.ceil(filteredCustoms.length / entriesCustom);
  const pagedCustoms = filteredCustoms.slice((pageCustom - 1) * entriesCustom, pageCustom * entriesCustom);

  const todayDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Replace template variables for preview
  const previewBody = (text) => {
    return (text || '')
      .replace(/\{GUEST_NAME\}/g, 'John Smith')
      .replace(/\{HOST_NAME\}/g, 'Jane Doe')
      .replace(/\{CHILD_NAME\}/g, 'Emma')
      .replace(/\{VENUE_NAME\}/g, 'Tiny Towne')
      .replace(/\{EVENT_DATE\}/g, '2026-04-15')
      .replace(/\{BOOKING_ID\}/g, '42')
      .replace(/\{TOTAL_COMING\}/g, '8')
      .replace(/\{BUSINESS_NAME\}/g, 'Tiny Towne')
      .replace(/\{BUSINESS_EMAIL\}/g, 'helenfunfactory@gmail.com')
      .replace(/\{BUSINESS_NUMBER\}/g, '404-944-4499');
  };

  // ---- CREATE VIEW ----
  if (view === 'create') {
    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button className="btn btn-event-new" onClick={() => { setView('list'); resetForm(); }}>Back to List</button>
          <button className="btn btn-primary" onClick={() => setShowFooterModal(true)}>+ Update Footer</button>
          <button className="btn btn-primary" onClick={() => setShowMissionModal(true)}>+ Mission Statement</button>
        </div>

        <div style={{ display: 'flex', gap: 24 }}>
          {/* Left - Form */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Title of Email</label>
                <input className="form-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Email title" />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Trigger</label>
                <select className="form-input" value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })}>
                  {TRIGGER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Action</label>
                <select className="form-input" value={form.action} onChange={e => setForm({ ...form, action: e.target.value })}>
                  <option value="after">After</option>
                  <option value="before">Before</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Send To</label>
                <select className="form-input" value={form.sendTo} onChange={e => setForm({ ...form, sendTo: e.target.value })}>
                  {SEND_TO_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Time</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" type="number" value={form.timeMins} onChange={e => setForm({ ...form, timeMins: parseInt(e.target.value) || 0 })} style={{ width: 100 }} />
                  <select className="form-input" value={form.timeUnit} onChange={e => setForm({ ...form, timeUnit: e.target.value })}>
                    <option value="Minutes">Minutes</option>
                    <option value="Hours">Hours</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Subject</label>
                <input className="form-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px 6px 0 0', border: '1px solid #e2e8f0', borderBottom: 'none', display: 'flex', gap: 12, fontSize: 13 }}>
                <span style={{ cursor: 'pointer' }}>File</span>
                <span style={{ cursor: 'pointer' }}>Edit</span>
                <span style={{ cursor: 'pointer' }}>View</span>
                <span style={{ cursor: 'pointer' }}>Insert</span>
                <span style={{ cursor: 'pointer' }}>Format</span>
                <span style={{ cursor: 'pointer' }}>Tools</span>
                <span style={{ cursor: 'pointer' }}>Table</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '4px 8px', border: '1px solid #e2e8f0', borderBottom: 'none', display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <span style={{ cursor: 'pointer' }}>&#8630;</span>
                <span style={{ cursor: 'pointer' }}>&#8631;</span>
                <span style={{ margin: '0 4px', color: '#cbd5e1' }}>|</span>
                <select style={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 3, padding: '2px 4px' }}>
                  <option>Variables</option>
                  <option>{'{GUEST_NAME}'}</option>
                  <option>{'{HOST_NAME}'}</option>
                  <option>{'{CHILD_NAME}'}</option>
                  <option>{'{VENUE_NAME}'}</option>
                  <option>{'{EVENT_DATE}'}</option>
                  <option>{'{TOTAL_COMING}'}</option>
                  <option>{'{BUSINESS_NAME}'}</option>
                </select>
                <select style={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 3, padding: '2px 4px' }}>
                  <option>Paragraph</option>
                </select>
                <span style={{ margin: '0 4px', color: '#cbd5e1' }}>|</span>
                <b style={{ cursor: 'pointer', padding: '0 4px' }}>B</b>
                <i style={{ cursor: 'pointer', padding: '0 4px' }}>I</i>
                <span style={{ margin: '0 4px', color: '#cbd5e1' }}>|</span>
                <span style={{ cursor: 'pointer' }}>&#9776;</span>
                <span style={{ cursor: 'pointer' }}>&#9776;</span>
                <span style={{ cursor: 'pointer' }}>&#9776;</span>
                <span style={{ cursor: 'pointer' }}>&#9776;</span>
              </div>
              <textarea
                className="form-input"
                value={form.body}
                onChange={e => setForm({ ...form, body: e.target.value })}
                rows={10}
                style={{ borderRadius: '0 0 6px 6px', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <button className="btn btn-event-new" onClick={handleCreate} style={{ padding: '10px 40px' }}>Create</button>
          </div>

          {/* Right - Preview */}
          <div style={{ width: 340, flexShrink: 0 }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ borderBottom: '1px solid #e2e8f0', padding: 16 }}></div>
              <div style={{ textAlign: 'center', padding: '16px 16px 8px', fontSize: 13, color: '#888' }}>
                <div style={{ fontStyle: 'italic', fontWeight: 600 }}>{todayDate}</div>
              </div>
              <div style={{ padding: '12px 16px', fontSize: 13, color: '#333', minHeight: 80 }}>
                {previewBody(form.body).split('\n').map((line, i) => (
                  <p key={i} style={{ margin: '4px 0' }}>{line}</p>
                ))}
              </div>
              <div style={{ background: footerBgColor, padding: '16px', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: 14 }}>Tiny Towne</div>
                    <div style={{ fontSize: 12, color: '#a8d4ff' }}>helenfunfactory@gmail.com</div>
                    <div style={{ fontSize: 12, marginTop: 2 }}>404-944-4499</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1,2,3,4].map(i => <span key={i} style={{ width: 16, height: 16, background: 'rgba(255,255,255,0.3)', borderRadius: 3, display: 'inline-block' }}></span>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showFooterModal && <FooterModal footerBgColor={footerBgColor} setFooterBgColor={setFooterBgColor} footerContent={footerContent} setFooterContent={setFooterContent} onClose={() => setShowFooterModal(false)} />}
        {showMissionModal && <MissionModal missionText={missionText} setMissionText={setMissionText} onClose={() => setShowMissionModal(false)} />}
      </div>
    );
  }

  // ---- EDIT VIEW ----
  if (view === 'edit') {
    const editingAutomation = automations.find(a => a.id === editingId);
    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button className="btn btn-event-new" onClick={() => { setView('list'); resetForm(); }}>Back to List</button>
          <button className="btn btn-primary" onClick={() => setShowFooterModal(true)}>+ Update Footer</button>
          <button className="btn btn-primary" onClick={() => setShowMissionModal(true)}>+ Mission Statement</button>
        </div>

        <div style={{ display: 'flex', gap: 24 }}>
          {/* Left - Edit Form */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Subject</label>
                <input className="form-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Trigger</label>
                <input className="form-input" value={form.triggerLabel || form.trigger} readOnly style={{ background: '#f1f5f9' }} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px 6px 0 0', border: '1px solid #e2e8f0', borderBottom: 'none', display: 'flex', gap: 12, fontSize: 13 }}>
                <span style={{ cursor: 'pointer' }}>File</span>
                <span style={{ cursor: 'pointer' }}>Edit</span>
                <span style={{ cursor: 'pointer' }}>View</span>
                <span style={{ cursor: 'pointer' }}>Insert</span>
                <span style={{ cursor: 'pointer' }}>Format</span>
                <span style={{ cursor: 'pointer' }}>Tools</span>
                <span style={{ cursor: 'pointer' }}>Table</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '4px 8px', border: '1px solid #e2e8f0', borderBottom: 'none', display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <span style={{ cursor: 'pointer' }}>&#8630;</span>
                <span style={{ cursor: 'pointer' }}>&#8631;</span>
                <span style={{ margin: '0 4px', color: '#cbd5e1' }}>|</span>
                <select style={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 3, padding: '2px 4px' }}>
                  <option>Variables</option>
                  <option>{'{GUEST_NAME}'}</option>
                  <option>{'{HOST_NAME}'}</option>
                  <option>{'{CHILD_NAME}'}</option>
                  <option>{'{VENUE_NAME}'}</option>
                  <option>{'{EVENT_DATE}'}</option>
                  <option>{'{TOTAL_COMING}'}</option>
                  <option>{'{BUSINESS_NAME}'}</option>
                </select>
                <select style={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 3, padding: '2px 4px' }}>
                  <option>Paragraph</option>
                </select>
                <span style={{ margin: '0 4px', color: '#cbd5e1' }}>|</span>
                <b style={{ cursor: 'pointer', padding: '0 4px' }}>B</b>
                <i style={{ cursor: 'pointer', padding: '0 4px' }}>I</i>
                <span style={{ margin: '0 4px', color: '#cbd5e1' }}>|</span>
                <span style={{ cursor: 'pointer' }}>&#9776;</span>
                <span style={{ cursor: 'pointer' }}>&#9776;</span>
                <span style={{ cursor: 'pointer' }}>&#9776;</span>
                <span style={{ cursor: 'pointer' }}>&#9776;</span>
              </div>
              <textarea
                className="form-input"
                value={form.body}
                onChange={e => setForm({ ...form, body: e.target.value })}
                rows={10}
                style={{ borderRadius: '0 0 6px 6px', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <button className="btn btn-event-new" onClick={handleSave} style={{ padding: '10px 40px' }}>Save</button>
          </div>

          {/* Right - Preview */}
          <div style={{ width: 340, flexShrink: 0 }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ borderBottom: '1px solid #e2e8f0', padding: 16 }}></div>
              <div style={{ textAlign: 'center', padding: '16px 16px 8px', fontSize: 13, color: '#888' }}>
                <div style={{ fontStyle: 'italic', fontWeight: 600 }}>{todayDate}</div>
              </div>
              <div style={{ padding: '12px 16px', fontSize: 13, color: '#333', minHeight: 80 }}>
                {previewBody(form.body).split('\n').map((line, i) => (
                  <p key={i} style={{ margin: '4px 0' }}>{line}</p>
                ))}
              </div>
              <div style={{ background: footerBgColor, padding: '16px', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: 14 }}>Tiny Towne</div>
                    <div style={{ fontSize: 12, color: '#a8d4ff' }}>helenfunfactory@gmail.com</div>
                    <div style={{ fontSize: 12, marginTop: 2 }}>404-944-4499</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1,2,3,4].map(i => <span key={i} style={{ width: 16, height: 16, background: 'rgba(255,255,255,0.3)', borderRadius: 3, display: 'inline-block' }}></span>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showFooterModal && <FooterModal footerBgColor={footerBgColor} setFooterBgColor={setFooterBgColor} footerContent={footerContent} setFooterContent={setFooterContent} onClose={() => setShowFooterModal(false)} />}
        {showMissionModal && <MissionModal missionText={missionText} setMissionText={setMissionText} onClose={() => setShowMissionModal(false)} />}
      </div>
    );
  }

  // ---- LIST VIEW ----
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className="btn btn-event-new" onClick={() => { resetForm(); setView('create'); }}>+ Create Email</button>
        <button className="btn btn-primary" onClick={() => setShowFooterModal(true)}>+ Update Footer</button>
        <button className="btn btn-primary" onClick={() => setShowMissionModal(true)}>+ Mission Statement</button>
      </div>

      {/* Custom Emails Section */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Custom Emails</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            Show
            <select className="form-input" style={{ width: 70, padding: '4px 8px' }} value={entriesCustom} onChange={e => { setEntriesCustom(Number(e.target.value)); setPageCustom(1); }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            Entries
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            Search:
            <input className="form-input" style={{ width: 180, padding: '4px 8px' }} value={searchCustom} onChange={e => { setSearchCustom(e.target.value); setPageCustom(1); }} />
          </div>
        </div>
        <table className="rooms-table">
          <thead>
            <tr>
              <th style={{ width: 140 }}>Enable/Disable</th>
              <th>Subject</th>
              <th>Trigger</th>
              <th style={{ width: 100 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {pagedCustoms.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>No data available in table</td>
              </tr>
            ) : pagedCustoms.map(a => (
              <tr key={a.id}>
                <td>
                  <div
                    className={`pkg-toggle ${a.enabled ? 'pkg-toggle-on' : 'pkg-toggle-off'}`}
                    onClick={() => toggleAutomation(a.id)}
                    title={a.enabled ? 'Click to disable' : 'Click to enable'}
                  >
                    <span className="pkg-toggle-label">{a.enabled ? 'Enabled' : 'Disabled'}</span>
                    <span className="pkg-toggle-knob"></span>
                  </div>
                </td>
                <td>{a.subject}</td>
                <td>{a.triggerLabel}</td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button className="room-action-btn room-edit" title="Edit" onClick={() => startEdit(a)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="room-action-btn room-delete" title="Delete" onClick={() => deleteAutomation(a.id)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="rooms-footer" style={{ marginTop: 8 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Showing {filteredCustoms.length === 0 ? '0 to 0' : `${(pageCustom - 1) * entriesCustom + 1} to ${Math.min(pageCustom * entriesCustom, filteredCustoms.length)}`} of {filteredCustoms.length} entries
          </span>
          {totalCustomPages > 1 && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-sm" disabled={pageCustom === 1} onClick={() => setPageCustom(p => p - 1)}>Previous</button>
              {Array.from({ length: totalCustomPages }, (_, i) => (
                <button key={i} className={`page-num ${pageCustom === i + 1 ? 'active' : ''}`} onClick={() => setPageCustom(i + 1)}>{i + 1}</button>
              ))}
              <button className="btn btn-sm" disabled={pageCustom === totalCustomPages} onClick={() => setPageCustom(p => p + 1)}>Next</button>
            </div>
          )}
        </div>
      </div>

      {/* Default Emails Section */}
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Default Emails</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            Show
            <select className="form-input" style={{ width: 70, padding: '4px 8px' }} value={entriesDefault} onChange={e => { setEntriesDefault(Number(e.target.value)); setPageDefault(1); }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            Entries
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            Search:
            <input className="form-input" style={{ width: 180, padding: '4px 8px' }} value={searchDefault} onChange={e => { setSearchDefault(e.target.value); setPageDefault(1); }} />
          </div>
        </div>
        <table className="rooms-table">
          <thead>
            <tr>
              <th style={{ width: 140 }}>Enable/Disable</th>
              <th>Subject</th>
              <th>Trigger</th>
              <th style={{ width: 100 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {pagedDefaults.map(a => (
              <tr key={a.id}>
                <td>
                  <div
                    className={`pkg-toggle ${a.enabled ? 'pkg-toggle-on' : 'pkg-toggle-off'}`}
                    onClick={() => toggleAutomation(a.id)}
                    title={a.enabled ? 'Click to disable' : 'Click to enable'}
                  >
                    <span className="pkg-toggle-label">{a.enabled ? 'Enabled' : 'Disabled'}</span>
                    <span className="pkg-toggle-knob"></span>
                  </div>
                </td>
                <td>{a.subject}</td>
                <td>{a.triggerLabel}</td>
                <td>
                  <button className="room-action-btn room-edit" title="Edit" onClick={() => startEdit(a)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="rooms-footer" style={{ marginTop: 8 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Showing {filteredDefaults.length === 0 ? '0 to 0' : `${(pageDefault - 1) * entriesDefault + 1} to ${Math.min(pageDefault * entriesDefault, filteredDefaults.length)}`} of {filteredDefaults.length} entries
          </span>
          {totalDefaultPages > 1 && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-sm" disabled={pageDefault === 1} onClick={() => setPageDefault(p => p - 1)}>Previous</button>
              {Array.from({ length: totalDefaultPages }, (_, i) => (
                <button key={i} className={`page-num ${pageDefault === i + 1 ? 'active' : ''}`} onClick={() => setPageDefault(i + 1)}>{i + 1}</button>
              ))}
              <button className="btn btn-sm" disabled={pageDefault === totalDefaultPages} onClick={() => setPageDefault(p => p + 1)}>Next</button>
            </div>
          )}
        </div>
      </div>

      {showFooterModal && <FooterModal footerBgColor={footerBgColor} setFooterBgColor={setFooterBgColor} footerContent={footerContent} setFooterContent={setFooterContent} onClose={() => setShowFooterModal(false)} />}
      {showMissionModal && <MissionModal missionText={missionText} setMissionText={setMissionText} onClose={() => setShowMissionModal(false)} />}
    </div>
  );
}

// ---- Footer Modal ----
function FooterModal({ footerBgColor, setFooterBgColor, footerContent, setFooterContent, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Update Footer</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
        </div>

        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Background color</label>
              <input type="color" value={footerBgColor} onChange={e => setFooterBgColor(e.target.value)} style={{ width: 40, height: 40, border: 'none', cursor: 'pointer' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px 6px 0 0', border: '1px solid #e2e8f0', borderBottom: 'none', display: 'flex', gap: 12, fontSize: 13 }}>
                <span>File</span><span>Edit</span><span>View</span><span>Insert</span><span>Format</span><span>Tools</span><span>Table</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '4px 8px', border: '1px solid #e2e8f0', borderBottom: 'none', display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <select style={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 3, padding: '2px 4px' }}><option>Variables</option></select>
                <select style={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 3, padding: '2px 4px' }}><option>Paragraph</option></select>
                <span style={{ margin: '0 4px', color: '#cbd5e1' }}>|</span>
                <b style={{ cursor: 'pointer', padding: '0 4px' }}>B</b>
                <i style={{ cursor: 'pointer', padding: '0 4px' }}>I</i>
                <span style={{ margin: '0 4px', color: '#cbd5e1' }}>|</span>
                <span>&#9776;</span><span>&#9776;</span><span>&#9776;</span><span>&#9776;</span>
              </div>
              <textarea
                className="form-input"
                value={footerContent}
                onChange={e => setFooterContent(e.target.value)}
                rows={8}
                style={{ borderRadius: '0 0 6px 6px', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <button className="btn btn-event-new" onClick={onClose} style={{ padding: '10px 40px' }}>Update</button>
          </div>

          {/* Preview */}
          <div style={{ width: 300, flexShrink: 0 }}>
            <div style={{ background: footerBgColor, padding: '16px', color: 'white', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {footerContent.replace(/\[BUSINESS_NAME\]/g, 'Tiny Towne').replace(/\[BUSINESS_EMAIL\]/g, 'helenfunfactory@gmail.com').replace(/\[BUSINESS_NUMBER\]/g, '404-944-4499').replace(/\[SOCIAL_MEDIA\]/g, '').split('\n').map((line, i) => (
                    <div key={i} style={{ fontSize: i === 0 ? 14 : 12, fontWeight: i === 0 ? 'bold' : 'normal', marginTop: i > 0 ? 2 : 0, color: line.includes('@') ? '#a8d4ff' : 'white' }}>{line}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1,2,3,4].map(i => <span key={i} style={{ width: 16, height: 16, background: 'rgba(255,255,255,0.3)', borderRadius: 3, display: 'inline-block' }}></span>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Mission Statement Modal ----
function MissionModal({ missionText, setMissionText, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Mission Statement</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Mission Statement</label>
          <textarea
            className="form-input"
            value={missionText}
            onChange={e => setMissionText(e.target.value)}
            rows={6}
            placeholder="Enter your mission statement..."
            style={{ resize: 'vertical' }}
          />
          <div style={{ textAlign: 'right', fontSize: 12, color: '#94a3b8', marginTop: 4 }}>500 character left</div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} style={{ background: '#e2e8f0', color: '#333' }}>Cancel</button>
          <button className="btn btn-event-new" onClick={onClose}>Save</button>
        </div>
      </div>
    </div>
  );
}
