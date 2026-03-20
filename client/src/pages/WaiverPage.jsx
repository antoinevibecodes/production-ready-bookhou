import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

const WAIVER_TEXT = `1) I, the undersigned, wish to play stated activity, and I recognize and understand that playing such activity (hereinafter called the "Game"), involves certain risks. Those risks include, but are not limited to, the risk of injury resulting from the use of equipment provided at the Game. I acknowledge that I have voluntarily chosen to participate notwithstanding the risks and I agree to accept any and all risks of injury, illness or death. In addition, I recognize that the exercise of playing the Game could increase my injury or illness.

2) I accept these and other risks, and fully understanding such risks. I can to play at the Game and to follow all the rules of the Game and hereby firmly and irrevocably hold the Tiny Towne LLC d/b/a Tiny Towne, its owners, managers, operators, officers, directors, shareholders, agents, employees, representatives, successors, assigns, and any and all third parties acting in any capacity on behalf of the Game, harmless from liability for any and all claims, demands, causes of actions, damages, loss, costs and expenses, lawsuits, judgments, obligations, liens, debts, and compensation whatsoever, or any other thing whatsoever, asserted, essentially, or unasserted, which may result from personal injury to me from said activity, or property damage, claimed by me or on my behalf.

3) I agree to hold harmless and indemnify the Releases from any and all liability for any damage to property or for any injury, illness or death to any person, including myself.

4) This agreement shall be effective and binding upon my heirs, next of kin, executors, personal representatives, administrators, successors and assigns.

5) I further declare that this document has been drawn up in the English language.

6) I further agree to return all of the equipment in good condition and if any of the equipment rented by me is damaged that is beyond normal wear and tear I agree that I am fully responsible for the cost of repair.

7) I understand that I am financially responsible and will be charged for any and all damages that I may cause while participating in this event, activity, or facility usage. This includes, but is not limited to, damage to property, equipment, or the venue itself.

8) I expressly agree that the foregoing Release Of Liability is intended to be as broad and inclusive as is permitted by the law of the State of Georgia and that if any portion thereof is held invalid, it is agreed that the balance shall nevertheless, continue in full legal force and effect so far as binding upon me.

9) I shall further assign to the SPONSORS all rights to use any photo or video of the taken relative to the Game I played in and allow the SPONSORS to use them in advertising.

I HAVE READ AND UNDERSTOOD THIS AGREEMENT. I AM AWARE THAT BY SIGNING THIS AGREEMENT I AM WAIVING CERTAIN LEGAL RIGHTS WHICH I OR MY HEIRS, NEXT OF KIN, EXECUTORS, PERSONAL REPRESENTATIVES, ADMINISTRATORS, SUCCESSORS AND ASSIGNS MAY HAVE AGAINST THE SPONSORS AND THEIR AGENTS AND EMPLOYEES.`;

const DRAFT_KEY_PREFIX = 'waiver_draft_';

export default function WaiverPage() {
  const { token } = useParams();
  const [waiver, setWaiver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');
  const [activeToken, setActiveToken] = useState(token);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [phoneLookedUp, setPhoneLookedUp] = useState(false);

  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    birthMonth: '',
    birthDay: '',
    birthYear: '',
    phone: '',
    street: '',
    apartment: '',
    city: '',
    zip: '',
    emergencyContact: '',
  });

  const [minors, setMinors] = useState([]);
  const [checks, setChecks] = useState([false, false, false]);
  const [acknowledged, setAcknowledged] = useState(false);

  const isWalkin = token.startsWith('walkin-');
  const walkinVenueId = isWalkin ? token.replace('walkin-', '') : null;
  const draftKey = DRAFT_KEY_PREFIX + token;

  // ─── Auto-save draft to localStorage ───
  useEffect(() => {
    if (!loading && !submitted) {
      const draft = { form, minors, marketingOptIn, step, checks, acknowledged };
      try { localStorage.setItem(draftKey, JSON.stringify(draft)); } catch {}
    }
  }, [form, minors, marketingOptIn, step, checks, acknowledged, loading, submitted]);

  // ─── Restore draft from localStorage ───
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.form) setForm(draft.form);
        if (draft.minors) setMinors(draft.minors);
        if (draft.marketingOptIn) setMarketingOptIn(draft.marketingOptIn);
        if (draft.checks) setChecks(draft.checks);
        if (draft.acknowledged) setAcknowledged(draft.acknowledged);
        // Don't restore step — always start at step 1
      }
    } catch {}
  }, []);

  // ─── Load waiver data ───
  useEffect(() => {
    if (isWalkin) {
      fetch(`/api/waivers/init-walkin/${walkinVenueId}`, { method: 'POST' })
        .then(async res => {
          if (!res.ok) { setError('Unable to load waiver form'); setLoading(false); return; }
          const data = await res.json();
          setActiveToken(data.token);
          setWaiver(data.waiver);
          setLoading(false);
        })
        .catch(() => { setError('Failed to load waiver'); setLoading(false); });
    } else {
      fetch(`/api/waivers/token/${token}`)
        .then(async res => {
          if (!res.ok) { setError('Waiver not found or invalid token'); setLoading(false); return; }
          const data = await res.json();
          setWaiver(data);
          setActiveToken(token);
          // Only pre-fill if we don't have a saved draft
          const hasDraft = !!localStorage.getItem(draftKey);
          if (!hasDraft) {
            const names = (data.guestName || '').split(' ');
            setForm(f => ({
              ...f,
              firstName: names[0] === 'Guest' || names[0] === 'Walk-in' ? '' : (names[0] || ''),
              lastName: names[0] === 'Guest' || names[0] === 'Walk-in' ? '' : (names.slice(1).join(' ') || ''),
              email: data.booking?.hostEmail || '',
              phone: data.booking?.hostPhone || '',
            }));
          }
          setLoading(false);
        })
        .catch(() => { setError('Failed to load waiver'); setLoading(false); });
    }
  }, [token]);

  // ─── Phone auto-fetch: look up customer profile ───
  const handlePhoneLookup = async () => {
    const phone = form.phone.replace(/\D/g, '');
    if (phone.length < 7 || phoneLookedUp) return;
    setPhoneLookedUp(true);

    try {
      const res = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (data.found && data.customer) {
        const c = data.customer;
        setForm(f => ({
          ...f,
          firstName: c.firstName || f.firstName,
          lastName: c.lastName || f.lastName,
          email: c.email || f.email,
          address: c.address || f.address,
          emergencyContact: c.emergencyContact || f.emergencyContact,
        }));
        if (c.children?.length > 0 && minors.length === 0) {
          setMinors(c.children.map(ch => ({ name: ch.name, age: ch.dob || '' })));
        }
        if (c.marketingOptIn) setMarketingOptIn(true);
        setCustomerFound(true);
      }
    } catch {}
  };

  // ─── Canvas drawing ───
  useEffect(() => {
    if (step === 3 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#d1d5db';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('SIGN HERE', 10, 25);

      const handleTouchStart = (e) => { e.preventDefault(); startDraw(e); };
      const handleTouchMove = (e) => { e.preventDefault(); draw(e); };
      const handleTouchEnd = () => endDraw();
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd);
      return () => {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [step]);

  const startDraw = (e) => {
    if (e.touches) e.preventDefault();
    isDrawingRef.current = true;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    if (e.touches) e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => { isDrawingRef.current = false; setIsDrawing(false); };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('SIGN HERE', 10, 25);
  };

  const handleSubmit = async () => {
    try {
      const signature = canvasRef.current?.toDataURL() || '';
      const address = `${form.street} ${form.apartment} ${form.city} ${form.zip}`.trim();
      const dob = form.birthMonth && form.birthDay && form.birthYear
        ? `${form.birthMonth}/${form.birthDay}/${form.birthYear}` : '';

      const res = await fetch(`/api/waivers/sign/${activeToken}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: `${form.firstName} ${form.lastName}`.trim(),
          guardianName: form.firstName + ' ' + form.lastName,
          signature,
          marketingOptIn,
          data: {
            email: form.email,
            phone: form.phone,
            birthDate: dob,
            dob,
            address,
            emergencyContact: form.emergencyContact,
            minors,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to submit waiver');
        return;
      }
      const result = await res.json();
      setVerifyToken(result.verifyToken || result.token);
      setSubmitted(true);
      // Clear draft on successful submit
      try { localStorage.removeItem(draftKey); } catch {}
    } catch (err) {
      setError('Failed to submit waiver');
    }
  };

  const addMinor = () => setMinors([...minors, { name: '', age: '' }]);
  const removeMinor = (i) => setMinors(minors.filter((_, idx) => idx !== i));

  const todayStr = new Date().toLocaleDateString('en-US');
  const inp = { flex: 1, padding: '10px 14px', background: '#e8edf2', border: 'none', borderRadius: 4, fontSize: 14 };
  const lbl = { width: 130, fontWeight: 600, fontSize: 14, color: '#374151', flexShrink: 0 };
  const row = { display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading waiver...</div>;
  if (error && !waiver) return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>{error}</div>;

  const verifyUrl = verifyToken ? `${window.location.origin}/verify/${verifyToken}` : '';

  if (submitted) {
    return (
      <div style={{ maxWidth: 700, margin: '40px auto', padding: 40, background: 'white', borderRadius: 12, textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ color: '#22c55e', marginBottom: 8 }}>Waiver Signed Successfully</h2>
        <p style={{ fontSize: 15, color: '#374151', marginBottom: 4 }}>Your waiver is valid for 1 year.</p>
        <p style={{ fontSize: 15, color: '#374151', marginBottom: 24 }}>Show this QR code at the front desk for verification.</p>

        {verifyUrl && (
          <div style={{ display: 'inline-block', padding: 20, background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, marginBottom: 20 }}>
            <QRCodeSVG value={verifyUrl} size={200} level="M" />
          </div>
        )}

        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
          Take a screenshot of this QR code to present at the front desk.
        </p>
        <p style={{ fontSize: 12, color: '#94a3b8' }}>
          A confirmation has been sent to your email/phone. You may close this page.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '20px auto', background: 'white', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
      {error && <div style={{ padding: 12, background: '#fee2e2', color: '#ef4444', textAlign: 'center', fontSize: 14 }}>{error}</div>}

      {customerFound && step === 1 && (
        <div style={{ padding: '10px 20px', background: '#dbeafe', color: '#1e40af', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
          Welcome back! We found your profile and pre-filled your information.
        </div>
      )}

      {/* ── STEP 1: Adult Information ── */}
      {step === 1 && (
        <div style={{ padding: '30px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ color: '#1e293b', fontSize: 22, fontWeight: 800 }}>ADULT INFORMATION</h2>
          </div>

          <div style={row}>
            <label style={lbl}>Date</label>
            <input type="text" value={todayStr} readOnly style={{ ...inp, background: '#f1f5f9' }} />
          </div>
          <div style={row}>
            <label style={lbl}>First Name</label>
            <input type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} style={inp} />
          </div>
          <div style={row}>
            <label style={lbl}>Last Name</label>
            <input type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} style={inp} />
          </div>
          <div style={row}>
            <label style={lbl}>Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setPhoneLookedUp(false); }}
              onBlur={handlePhoneLookup}
              placeholder="Enter phone to auto-fill"
              style={inp}
            />
          </div>
          <div style={row}>
            <label style={lbl}>Email Address</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} />
          </div>
          <div style={{ ...row, marginBottom: 24 }}>
            <label style={lbl}>Birth Date</label>
            <div style={{ flex: 1, display: 'flex', gap: 12 }}>
              <select value={form.birthMonth} onChange={e => setForm(f => ({ ...f, birthMonth: e.target.value }))} style={{ flex: 1, padding: '10px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14 }}>
                <option value="">Month</option>
                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>)}
              </select>
              <select value={form.birthDay} onChange={e => setForm(f => ({ ...f, birthDay: e.target.value }))} style={{ flex: 1, padding: '10px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14 }}>
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
              </select>
              <select value={form.birthYear} onChange={e => setForm(f => ({ ...f, birthYear: e.target.value }))} style={{ flex: 1, padding: '10px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14 }}>
                <option value="">Year</option>
                {Array.from({ length: 80 }, (_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}
              </select>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ color: '#1e293b', fontSize: 22, fontWeight: 800 }}>CONTACT INFORMATION</h2>
          </div>

          <div style={row}>
            <label style={lbl}>Street Address</label>
            <input type="text" value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} placeholder="Street Address" style={inp} />
          </div>
          <div style={row}>
            <label style={lbl}>Apartment</label>
            <input type="text" value={form.apartment} onChange={e => setForm(f => ({ ...f, apartment: e.target.value }))} placeholder="Apt/Suite (Optional)" style={inp} />
          </div>
          <div style={row}>
            <label style={lbl}>City</label>
            <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City" style={inp} />
          </div>
          <div style={row}>
            <label style={lbl}>Zip Code</label>
            <input type="text" value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} style={inp} />
          </div>
          <div style={row}>
            <label style={lbl}>Emergency Contact</label>
            <input type="text" value={form.emergencyContact} onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))} placeholder="Name & Phone Number" style={inp} />
          </div>

          <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 16 }}>
            <h2 style={{ color: '#1e293b', fontSize: 22, fontWeight: 800 }}>MINOR INFORMATION</h2>
            <p style={{ color: '#64748b', fontSize: 13 }}>Add children participating under this guardian</p>
          </div>

          {minors.length === 0 ? (
            <div style={{ background: '#fef3c7', color: '#92400e', textAlign: 'center', padding: '10px 16px', borderRadius: 6, marginBottom: 12, fontSize: 14 }}>
              No minors added — tap below to add
            </div>
          ) : (
            minors.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                <input type="text" placeholder="Child's full name" value={m.name} onChange={e => { const u = [...minors]; u[i].name = e.target.value; setMinors(u); }} style={{ flex: 2, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14 }} />
                <input type="text" placeholder="DOB or Age" value={m.age} onChange={e => { const u = [...minors]; u[i].age = e.target.value; setMinors(u); }} style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14 }} />
                <button onClick={() => removeMinor(i)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>X</button>
              </div>
            ))
          )}

          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <button onClick={addMinor} style={{ background: 'none', border: 'none', color: '#1e293b', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+ <span style={{ color: '#0d9488' }}>Add Minor</span></button>
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 24, cursor: 'pointer', fontSize: 13, color: '#64748b' }}>
            <input type="checkbox" checked={marketingOptIn} onChange={() => setMarketingOptIn(!marketingOptIn)} style={{ marginTop: 2 }} />
            <span>I agree to receive promotional offers and updates from Tiny Towne</span>
          </label>

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setError('');
                if (!form.firstName || !form.lastName) { setError('First name and last name are required'); return; }
                if (!form.phone) { setError('Phone number is required'); return; }
                setStep(2);
              }}
              style={{ padding: '14px 60px', background: 'linear-gradient(90deg, #22c55e, #0d9488)', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Liability Waiver Form ── */}
      {step === 2 && (
        <div style={{ padding: '30px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>You must read and check all 3 checkboxes below</p>
            <h2 style={{ color: '#1e293b', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Liability Waiver Form</h2>
            <p style={{ color: '#6b7280', fontSize: 13 }}>Assumption of Risk</p>
          </div>

          <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 8, padding: 20, maxHeight: 350, overflowY: 'auto', fontSize: 13, lineHeight: 1.7, color: '#374151', marginBottom: 20, whiteSpace: 'pre-wrap' }}>
            {WAIVER_TEXT}
          </div>

          <div style={{ marginBottom: 20 }}>
            {['I have read and understood the above waiver and assumption of risk.',
              'I agree to all terms and conditions stated above.',
              'I confirm that the information I have provided is accurate.'].map((text, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={checks[i]} onChange={() => { const c = [...checks]; c[i] = !c[i]; setChecks(c); }} style={{ marginTop: 3 }} />
                <span>{text}</span>
              </label>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
            In consideration of participating in the "Game", I hereby agree as follows.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => { setError(''); setStep(1); }} style={{ padding: '12px 32px', background: '#6b7280', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Back
            </button>
            <button onClick={() => { setError(''); if (checks.every(Boolean)) setStep(3); else setError('Please check all 3 checkboxes'); }} style={{ padding: '12px 32px', background: 'linear-gradient(90deg, #22c55e, #0d9488)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Signature ── */}
      {step === 3 && (
        <div style={{ padding: '30px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ color: '#1e293b', fontSize: 22, fontWeight: 800 }}>SIGNATURE</h2>
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 24, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={acknowledged} onChange={() => setAcknowledged(!acknowledged)} style={{ marginTop: 3 }} />
            <span>I acknowledge I have read and understand the waiver and certify that all personal information is correct.</span>
          </label>

          <div style={{ marginBottom: 12 }}>
            <canvas
              ref={canvasRef}
              width={580}
              height={200}
              style={{ width: '100%', height: 200, borderRadius: 8, cursor: 'crosshair', border: '2px dashed #9ca3af' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
            />
            <div style={{ textAlign: 'right', marginTop: 4 }}>
              <button onClick={clearSignature} style={{ padding: '4px 16px', border: '1px solid #d1d5db', borderRadius: 4, background: 'white', fontSize: 13, cursor: 'pointer' }}>Clear</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 20 }}>
            <button onClick={() => { setError(''); setStep(1); }} style={{ padding: '8px 20px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Start Over</button>
            <button onClick={() => { setError(''); setStep(1); }} style={{ padding: '8px 20px', background: '#0d9488', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Change Info</button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button onClick={() => { if (!acknowledged) { setError('Please acknowledge the checkbox'); return; } setError(''); handleSubmit(); }} style={{ padding: '14px 80px', background: 'linear-gradient(90deg, #22c55e, #0d9488)', color: 'white', border: 'none', borderRadius: 8, fontSize: 18, fontWeight: 700, cursor: 'pointer' }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
