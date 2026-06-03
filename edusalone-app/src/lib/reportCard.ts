// ============================================================================
// EduSalone — Shared Report Card Builder
// Location in project: src/lib/reportCard.ts
// ============================================================================

export interface ClassRecord {
  student_id: string;
  subject: string;
  term: string;
  academic_year?: string | null;
  score?: number | null;
  test_1?: number | null;
  test_2?: number | null;
  exam?: number | null;
}

export interface BuildReportArgs {
  school: { name?: string | null; logo_url?: string | null; school_code?: string | null };
  student: {
    id: string;
    full_name?: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
    admission_number?: string | null;
    current_class?: string | null;
  };
  academicYear: string;
  classRecords: ClassRecord[];
  classSize: number;
  attendance: { present: number; absent: number; late: number };
  ev: any;
  verifyBaseUrl?: string;
}

type TermKey = 'First' | 'Second' | 'Third';
const TERMS: TermKey[] = ['First', 'Second', 'Third'];

function termKeyOf(t: string | null | undefined): TermKey | null {
  const s = t || '';
  if (s.includes('First')) return 'First';
  if (s.includes('Second')) return 'Second';
  if (s.includes('Third')) return 'Third';
  return null;
}

function n(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const x = Number(v);
  return isNaN(x) ? null : x;
}

function totOf(rec: ClassRecord): number | null {
  const s = n(rec.score);
  if (s !== null) return s;
  const a = n(rec.test_1), b = n(rec.test_2), c = n(rec.exam);
  if (a === null && b === null && c === null) return null;
  return (a || 0) + (b || 0) + (c || 0);
}

function rankMap(entries: { id: string; val: number }[]): Record<string, number> {
  const sorted = [...entries].sort((x, y) => y.val - x.val);
  const out: Record<string, number> = {};
  let rank = 0, seen = 0, prev: number | null = null;
  for (const e of sorted) {
    seen++;
    if (prev === null || e.val < prev) { rank = seen; prev = e.val; }
    out[e.id] = rank;
  }
  return out;
}

function ord(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '-';
  const v = num % 100;
  const suf = (v >= 11 && v <= 13) ? 'th' : (['th', 'st', 'nd', 'rd'][num % 10] || 'th');
  return num + suf;
}

function esc(s: any): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function schoolPalette(name: string, isJSS: boolean) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  const hslToHex = (hh: number, s: number, l: number) => {
    s /= 100; l /= 100;
    const k = (nn: number) => (nn + hh / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (nn: number) => l - a * Math.max(-1, Math.min(k(nn) - 3, 9 - k(nn), 1));
    const t = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
    return `#${t(f(0))}${t(f(8))}${t(f(4))}`;
  };
  return {
    primary: hslToHex(hue, 52, 24),
    band: hslToHex(hue, 50, 31),
    soft: hslToHex(hue, 45, 95),
    accent: isJSS ? '#C49A3A' : '#5E7A99',
    levelName: isJSS ? 'JUNIOR SECONDARY SCHOOL' : 'SENIOR SECONDARY SCHOOL',
    levelTag: isJSS ? 'JSS' : 'SS',
    examBoard: isJSS ? 'BECE / WAEC' : 'WASSCE / WAEC',
  };
}

// Decide the level from the class name. Robust to spacing/case and the old "Form" naming.
//   SS  = Senior Secondary (A1–F9, WASSCE/WAEC)
//   JSS = Junior Secondary (1–6, BECE/WAEC)
// NOTE: To add a PRIMARY level later, return a third value from here and extend
// schoolPalette(), gradeFor() and the grade-key bar to handle it. The rest of the
// builder does not need to change.
function detectIsJSS(cls: string | null | undefined): boolean {
  const c = (cls || '').toUpperCase().replace(/\s+/g, ' ').trim();
  // Explicit SENIOR markers → Senior Secondary
  if (c.includes('SSS') || c.includes('SENIOR')) return false;
  if (/\bSS\s*\d/.test(c)) return false;            // "SS2", "SS 2"
  // Explicit JUNIOR markers → Junior Secondary
  if (c.includes('JSS') || c.includes('JUNIOR')) return true;
  if (/\bJS\s*\d/.test(c)) return true;             // "JS 1"
  // Old "Form" system: Forms 1–3 are junior, Forms 4–6 senior
  const f = c.match(/FORM\s*(\d)/);
  if (f) return Number(f[1]) <= 3;
  // Primary-style names (Class/Basic/Primary/etc.) → numeric 1–6 grading for now
  if (/CLASS|BASIC|PRIMARY|NURSERY|\bKG\b|PREP|GRADE/.test(c)) return true;
  // Unrecognised → default to Senior (same as the previous behaviour)
  return false;
}

function gradeFor(tot: number, isJSS: boolean): [string, string, boolean] {
  if (isJSS) {
    if (tot >= 75) return ['1', 'EXCELLENT', true];
    if (tot >= 65) return ['2', 'V. GOOD', true];
    if (tot >= 55) return ['3', 'GOOD', true];
    if (tot >= 45) return ['4', 'CREDIT', true];
    if (tot >= 35) return ['5', 'PASS', true];
    return ['6', 'FAIL', false];
  }
  if (tot >= 75) return ['A1', 'EXCELLENT', true];
  if (tot >= 70) return ['B2', 'V. GOOD', true];
  if (tot >= 65) return ['B3', 'GOOD', true];
  if (tot >= 60) return ['C4', 'CREDIT', true];
  if (tot >= 55) return ['C5', 'CREDIT', true];
  if (tot >= 50) return ['C6', 'CREDIT', true];
  if (tot >= 45) return ['D7', 'PASS', true];
  if (tot >= 40) return ['E8', 'PASS', true];
  return ['F9', 'FAIL', false];
}

function shortHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).toUpperCase().padStart(5, '0').slice(0, 5);
}

export function buildReportCardHTML(args: BuildReportArgs): string {
  const { school, student, academicYear, attendance, ev } = args;
  const isJSS = detectIsJSS(student.current_class);
  const p = schoolPalette(school.name || 'EduSalone', isJSS);

  const yrRecords = args.classRecords.filter(r => !r.academic_year || r.academic_year === academicYear);

  const byStudent: Record<string, Record<string, Partial<Record<TermKey, number>>>> = {};
  const subjectsSet = new Set<string>();
  for (const r of yrRecords) {
    const tk = termKeyOf(r.term);
    if (!tk) continue;
    const tot = totOf(r);
    if (tot === null) continue;
    subjectsSet.add(r.subject);
    (byStudent[r.student_id] ||= {});
    (byStudent[r.student_id][r.subject] ||= {});
    byStudent[r.student_id][r.subject][tk] = tot;
  }

  const subjectTermRank: Record<string, Partial<Record<TermKey, Record<string, number>>>> = {};
  const subjectYearRank: Record<string, Record<string, number>> = {};
  for (const subj of subjectsSet) {
    subjectTermRank[subj] = {};
    for (const tk of TERMS) {
      const entries: { id: string; val: number }[] = [];
      for (const sid in byStudent) {
        const v = byStudent[sid][subj]?.[tk];
        if (v !== undefined) entries.push({ id: sid, val: v });
      }
      if (entries.length) subjectTermRank[subj][tk] = rankMap(entries);
    }
    const yEntries: { id: string; val: number }[] = [];
    for (const sid in byStudent) {
      const m = byStudent[sid][subj];
      if (!m) continue;
      const sum = (m.First || 0) + (m.Second || 0) + (m.Third || 0);
      if (m.First !== undefined || m.Second !== undefined || m.Third !== undefined) yEntries.push({ id: sid, val: sum });
    }
    if (yEntries.length) subjectYearRank[subj] = rankMap(yEntries);
  }

  const termRank: Partial<Record<TermKey, Record<string, number>>> = {};
  for (const tk of TERMS) {
    const entries: { id: string; val: number }[] = [];
    for (const sid in byStudent) {
      let sum = 0, has = false;
      for (const subj in byStudent[sid]) {
        const v = byStudent[sid][subj][tk];
        if (v !== undefined) { sum += v; has = true; }
      }
      if (has) entries.push({ id: sid, val: sum });
    }
    if (entries.length) termRank[tk] = rankMap(entries);
  }
  const yearlyEntries: { id: string; val: number }[] = [];
  for (const sid in byStudent) {
    let sum = 0;
    for (const subj in byStudent[sid]) {
      const m = byStudent[sid][subj];
      sum += (m.First || 0) + (m.Second || 0) + (m.Third || 0);
    }
    yearlyEntries.push({ id: sid, val: sum });
  }
  const yearlyRank = rankMap(yearlyEntries);

  const raw: Record<string, Partial<Record<TermKey, { t1: any; t2: any; ex: any; tot: number }>>> = {};
  for (const r of yrRecords) {
    if (r.student_id !== student.id) continue;
    const tk = termKeyOf(r.term);
    if (!tk) continue;
    const tot = totOf(r);
    if (tot === null) continue;
    (raw[r.subject] ||= {});
    raw[r.subject][tk] = { t1: n(r.test_1), t2: n(r.test_2), ex: n(r.exam), tot };
  }
  const targetSubjects = Object.keys(raw).sort();

  const colSum = {
    First: { t1: 0, t2: 0, ex: 0, tot: 0 },
    Second: { t1: 0, t2: 0, ex: 0, tot: 0 },
    Third: { t1: 0, t2: 0, ex: 0, tot: 0 },
    yearly: 0,
  };
  let grandTotal = 0, maxObtainable = 0;

  const cell = (v: any) => (v === null || v === undefined) ? '-' : v;

  let rowsHtml = '';
  if (targetSubjects.length === 0) {
    rowsHtml = `<tr><td colspan="25" style="text-align:center;padding:24px;font-style:italic;color:#718096;">No academic records found for this student.</td></tr>`;
  } else {
    for (const subj of targetSubjects) {
      const parts: Record<TermKey, any> = { First: raw[subj].First, Second: raw[subj].Second, Third: raw[subj].Third } as any;
      let yTot = 0, terms = 0;
      TERMS.forEach(tk => { const t = parts[tk]; if (t) { yTot += t.tot; terms++; colSum[tk].t1 += t.t1 || 0; colSum[tk].t2 += t.t2 || 0; colSum[tk].ex += t.ex || 0; colSum[tk].tot += t.tot; } });
      colSum.yearly += yTot; grandTotal += yTot; maxObtainable += terms * 100;

      const subjMean = terms ? yTot / terms : 0;
      const [g, rem, pass] = gradeFor(subjMean, isJSS);
      const yRnk = subjectYearRank[subj]?.[student.id];

      const block = (tk: TermKey) => {
        const t = parts[tk];
        if (!t) return `<td class="grp">-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>`;
        const r = subjectTermRank[subj]?.[tk]?.[student.id];
        return `<td class="grp">${cell(t.t1)}</td><td>${cell(t.t2)}</td><td>${cell(t.ex)}</td><td class="tot">${t.tot}</td><td>${t.tot}</td><td>${ord(r)}</td>`;
      };

      rowsHtml += `<tr>
        <td class="subj">${esc(subj)}</td><td>100</td>
        ${block('First')}${block('Second')}${block('Third')}
        <td class="grp tot">${terms ? yTot : '-'}</td><td class="tot">${terms ? subjMean.toFixed(1) : '-'}</td>
        <td>${ord(yRnk)}</td>
        <td><span class="pill ${pass ? 'pass' : 'fail'}">${terms ? g : '-'}</span></td>
        <td class="rem ${pass ? 'rp' : 'rf'}">${terms ? rem : '-'}</td>
      </tr>`;
    }
  }

  const meanOf = (tot: number, cnt: number) => cnt ? (tot / cnt).toFixed(1) : '-';
  const subjCountPerTerm = (tk: TermKey) => targetSubjects.filter(s => raw[s][tk]).length;
  const overallMean = maxObtainable ? (grandTotal / maxObtainable * 100).toFixed(1) : '0';
  const myYearRnk = yearlyRank[student.id];

  const totalsRow = `
    <tr class="totals-row">
      <td class="subj" style="color:#fff;background:${p.accent};">TOTAL / POSITION</td><td>—</td>
      <td class="grp">${colSum.First.t1 || '-'}</td><td>${colSum.First.t2 || '-'}</td><td>${colSum.First.ex || '-'}</td><td class="tot">${colSum.First.tot || '-'}</td><td>${meanOf(colSum.First.tot, subjCountPerTerm('First'))}</td><td>${ord(termRank.First?.[student.id])}</td>
      <td class="grp">${colSum.Second.t1 || '-'}</td><td>${colSum.Second.t2 || '-'}</td><td>${colSum.Second.ex || '-'}</td><td class="tot">${colSum.Second.tot || '-'}</td><td>${meanOf(colSum.Second.tot, subjCountPerTerm('Second'))}</td><td>${ord(termRank.Second?.[student.id])}</td>
      <td class="grp">${colSum.Third.t1 || '-'}</td><td>${colSum.Third.t2 || '-'}</td><td>${colSum.Third.ex || '-'}</td><td class="tot">${colSum.Third.tot || '-'}</td><td>${meanOf(colSum.Third.tot, subjCountPerTerm('Third'))}</td><td>${ord(termRank.Third?.[student.id])}</td>
      <td class="grp tot">${grandTotal || '-'}</td><td class="tot">${overallMean}%</td><td class="pos">${ord(myYearRnk)}</td><td>—</td><td class="rem rp">OVERALL</td>
    </tr>`;

  const TRAIT_C: any = { 1: '#cc2200', 2: '#dd6600', 3: '#c79a00', 4: '#3182CE', 5: '#2f855a' };
  const traitRow = (name: string, v: number) => {
    let dots = '';
    for (let i = 1; i <= 5; i++) dots += `<div class="dot ${i === v ? 'on' : ''}" style="${i === v ? `background:${TRAIT_C[v]};border-color:${TRAIT_C[v]};` : ''}">${i === v ? '✓' : ''}</div>`;
    return `<div class="prow"><span class="pname">${name}</span><div class="dots">${dots}</div></div>`;
  };
  const skillRow = (name: string, v: number) => {
    let bars = '';
    for (let i = 1; i <= 5; i++) bars += `<div class="bar" style="${i <= v && v > 0 ? `background:${p.primary};border-color:${p.primary};` : ''}"></div>`;
    return `<div class="prow"><span class="pname">${name}</span><div class="bars">${bars}</div><span class="score">${v > 0 ? v : '—'}</span></div>`;
  };

  const keys = isJSS
    ? [['75–100', 'Grd 1 EXCELLENT', '#1f6f4a'], ['65–74', 'Grd 2 V.GOOD', '#4A5568'], ['45–64', 'Grd 3/4 CREDIT', '#2b6cb0'], ['35–44', 'Grd 5 PASS', '#4299e1'], ['0–34', 'Grd 6 FAIL', '#e53e3e']]
    : [['75–100', 'A1 EXCELLENT', '#1f6f4a'], ['65–74', 'B2/B3 GOOD', '#4A5568'], ['50–64', 'C4–C6 CREDIT', '#2b6cb0'], ['40–49', 'D7/E8 PASS', '#4299e1'], ['0–39', 'F9 FAIL', '#e53e3e']];
  const keyBar = `<div class="keys">${keys.map(k => `<div class="key" style="background:${k[2]}">${k[0]}: ${k[1]}</div>`).join('')}</div>`;

  const initials = (school.name || 'ES').split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
  const logoHtml = school.logo_url
    ? `<img src="${school.logo_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt=""/>`
    : `<span style="font-weight:900;font-size:14px;color:${p.primary};">${initials}</span>`;

  const token = (shortHash(`${school.school_code}|${student.admission_number}|${academicYear}|${grandTotal}|${student.id}`)
    + shortHash(`${student.full_name}|${student.id}|${academicYear}|${maxObtainable}`)).toLowerCase();
  const verifyUrl = (args.verifyBaseUrl || 'https://verify.edusalone.sl/r/') + token;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(verifyUrl)}&color=${p.primary.replace('#', '')}&bgcolor=FFFFFF`;

  const promotion = (ev?.promotion_status || 'PENDING');
  const teacherRemark = ev?.teacher_comment || 'No comments provided for this term.';
  const studentName = (student.full_name || 'UNKNOWN').toUpperCase();

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #fff; font-family: Georgia, 'Times New Roman', serif; }
    .page { width: 210mm; min-height: 297mm; padding: 10mm; display: flex; flex-direction: column;
      --primary:${p.primary}; --band:${p.band}; --soft:${p.soft}; --accent:${p.accent}; }
    .frame { border: 4px solid var(--primary); box-shadow: inset 0 0 0 2px var(--accent); border-radius: 6px;
      padding: 12px; flex: 1; display: flex; flex-direction: column; position: relative; overflow: hidden; }
    .wm { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-family:Arial,sans-serif;
      font-size:120px; font-weight:900; color:var(--soft); opacity:.55; letter-spacing:6px; z-index:0; }
    .content { position: relative; z-index: 1; display:flex; flex-direction:column; flex:1; }
    .header { display:flex; align-items:center; gap:14px; border-bottom: 3px double var(--accent); padding-bottom:9px; }
    .logo { width:60px; height:60px; border-radius:50%; border:2px solid var(--primary); background:var(--soft);
      display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden; }
    .hdr-mid { flex:1; text-align:center; }
    .hdr-mid h1 { font-size:23px; color:var(--primary); letter-spacing:1px; text-transform:uppercase; }
    .hdr-mid .sub { font-family:Arial,sans-serif; font-size:9px; color:#4a5568; font-weight:bold; margin-top:2px; }
    .hdr-mid .motto { font-size:11px; font-style:italic; color:var(--accent); margin-top:1px; }
    .banner { margin-top:9px; background: linear-gradient(100deg, var(--primary), var(--band) 60%, var(--accent));
      color:#fff; border-radius:5px; padding:7px 14px; display:flex; align-items:center; justify-content:space-between; }
    .banner .t { font-family:Arial,sans-serif; font-weight:900; font-size:12px; letter-spacing:1.4px; }
    .lvl { font-family:Arial,sans-serif; font-weight:900; font-size:10px; background:#fff; color:var(--primary); padding:3px 11px; border-radius:20px; letter-spacing:1px; }
    .top { display:grid; grid-template-columns:1.25fr 1fr 1fr; border:1.5px solid var(--accent); border-radius:5px; overflow:hidden; margin-top:9px; }
    .blk { border-right:1px solid var(--accent); } .blk:last-child { border-right:none; }
    .blk-h { background:var(--primary); color:#fff; font-family:Arial,sans-serif; font-weight:bold; font-size:10px; text-align:center; padding:4px; }
    .it { width:100%; border-collapse:collapse; font-family:Arial,sans-serif; }
    .it td { padding:4px 6px; border-bottom:1px solid #eef2f6; font-size:10.5px; }
    .it td:first-child { font-weight:bold; color:var(--primary); width:42%; background:var(--soft); }
    .att { display:grid; grid-template-columns:1fr 1fr 1fr; text-align:center; height:100%; align-content:center; }
    .att .ah { font-family:Arial,sans-serif; font-weight:bold; font-size:8px; color:var(--primary); background:var(--soft); padding:3px 0; }
    .att .av { font-family:Arial,sans-serif; font-size:14px; font-weight:bold; padding:5px 0; }
    .sl { display:flex; justify-content:space-between; padding:4px 8px; border-bottom:1px solid #eef2f6; font-family:Arial,sans-serif; font-size:10px; }
    .sl .l { color:#4a5568; font-weight:bold; } .sl .v { color:var(--primary); font-weight:900; }
    .acad { width:100%; border-collapse:collapse; table-layout:fixed; margin-top:9px; border:1.5px solid var(--accent);
      border-radius:5px; overflow:hidden; font-family:Arial,sans-serif; }
    .acad th, .acad td { border:1px solid #cbd5e0; text-align:center; padding:2.8px 1px; font-size:8.3px; }
    .acad thead th { background:var(--primary); color:#fff; font-weight:bold; }
    .acad .grp { border-left:2px solid var(--accent) !important; }
    .acad .subj { text-align:left; padding-left:5px; font-weight:bold; font-size:8px; color:var(--primary); background:var(--soft); }
    .acad tbody tr:nth-child(even) { background:#f7fafc; }
    .acad .tot { font-weight:900; color:var(--primary); }
    .acad .totals-row td { background:var(--soft) !important; font-weight:900; border-top:2px solid var(--accent); }
    .acad .totals-row .pos { color:#fff; background:var(--accent) !important; font-size:8px; }
    .pill { display:inline-block; padding:1px 6px; border-radius:8px; font-weight:900; font-size:8.3px; }
    .pass { background:#d6f5e0; color:#1b6e3c; } .fail { background:#fde0e0; color:#c0392b; }
    .rem { font-size:7.5px; font-weight:900; } .rp { color:#1b6e3c; } .rf { color:#c0392b; }
    .keys { display:grid; grid-template-columns:repeat(5,1fr); margin-top:7px; border-radius:5px; overflow:hidden; font-family:Arial,sans-serif; }
    .key { text-align:center; padding:5px 2px; font-size:8px; font-weight:bold; color:#fff; }
    .panels { display:grid; grid-template-columns:1fr 1fr; border:1.5px solid var(--accent); border-radius:5px; overflow:hidden; margin-top:7px; flex: 1 1 auto; }
    .panel { border-right:1px solid var(--accent); display:flex; flex-direction:column; } .panel:last-child { border-right:none; }
    .panel-h { background:var(--primary); color:#fff; font-family:Arial,sans-serif; font-weight:bold; font-size:9px; padding:4px 8px; }
    .prow { display:flex; align-items:center; padding:3.5px 8px; border-bottom:1px solid #eef2f6; font-family:Arial,sans-serif; flex: 1 1 auto; }
    .prow:nth-child(even) { background:var(--soft); }
    .pname { flex:1; font-size:9.5px; font-weight:bold; color:#2d3748; }
    .dots { display:flex; gap:3px; }
    .dot { width:11px; height:11px; border-radius:50%; border:1px solid #b6bfca; background:#fff; display:flex; align-items:center; justify-content:center; color:#fff; font-size:7px; }
    .bars { display:flex; gap:2px; align-items:center; }
    .bar { width:12px; height:7px; border-radius:1px; border:1px solid #cbd5e0; background:#edf2f7; }
    .score { font-size:9.5px; font-weight:bold; min-width:14px; text-align:right; margin-left:6px; color:var(--primary); }
    .bottom { margin-top: 8px; }
    .sigs { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:9px; }
    .sig { border:1.5px solid var(--accent); border-radius:7px; padding:10px; background:var(--soft); }
    .sig .lbl { font-family:Arial,sans-serif; font-weight:900; font-size:9px; color:var(--primary); text-transform:uppercase; border-bottom:1px solid var(--accent); padding-bottom:4px; margin-bottom:6px; }
    .sig .val { font-size:10px; font-style:italic; font-weight:bold; color:#2d3748; min-height:28px; }
    .sig .line { margin-top:20px; border-top:1px dashed var(--primary); width:85%; padding-top:3px; font-family:Arial,sans-serif; font-size:8px; font-weight:bold; color:#4a5568; }
    .foot { display:flex; align-items:stretch; gap:12px; margin-top:9px; }
    .promo { flex:1; border:2px solid var(--accent); background:var(--primary); color:#fff; font-family:Arial,sans-serif; font-weight:900; font-size:11px; letter-spacing:1px; text-align:center; padding:10px; border-radius:6px; display:flex; align-items:center; justify-content:center; }
    .auth { border:2px solid var(--accent); border-radius:6px; padding:6px 10px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px;
      background: repeating-linear-gradient(45deg, var(--soft), var(--soft) 6px, #fff 6px, #fff 12px); }
    .auth .qr { width:62px; height:62px; border:1px solid var(--accent); border-radius:4px; padding:2px; background:#fff; }
    .auth .cap { font-family:Arial,sans-serif; font-size:7.5px; font-weight:900; color:var(--primary); letter-spacing:1px; }
    .legalese { text-align:center; font-family:Arial,sans-serif; font-size:7px; font-style:italic; color:#a0aec0; margin-top:8px; border-top:1px solid #e2e8f0; padding-top:5px; }
  </style></head><body>
  <div class="page">
    <div class="frame">
      <div class="wm">OFFICIAL</div>
      <div class="content">
        <div class="header">
          <div class="logo">${logoHtml}</div>
          <div class="hdr-mid">
            <h1>${esc(school.name || 'School Name')}</h1>
            <div class="sub">Sierra Leone's Premier Institution</div>
            <div class="motto">Knowledge, Courage &amp; Excellence</div>
          </div>
          <div class="logo">${logoHtml}</div>
        </div>

        <div class="banner">
          <div class="t">${p.levelName} — PROGRESS REPORT ${esc(academicYear)}</div>
          <div class="lvl">${p.levelTag} LEVEL</div>
        </div>

        <div class="top">
          <div class="blk">
            <div class="blk-h">STUDENT'S PERSONAL DATA</div>
            <table class="it">
              <tr><td>Name</td><td style="font-weight:900">${esc(studentName)}</td></tr>
              <tr><td>Sex</td><td>${esc(student.gender || '-')}</td></tr>
              <tr><td>Date of Birth</td><td>${esc(student.date_of_birth || '-')}</td></tr>
              <tr><td>Form</td><td style="font-weight:bold">${esc(student.current_class || '-')}</td></tr>
              <tr><td>Admission No.</td><td style="color:var(--primary);font-weight:bold">${esc(student.admission_number || '-')}</td></tr>
            </table>
          </div>
          <div class="blk">
            <div class="blk-h">ATTENDANCE</div>
            <div class="att">
              <div class="ah">Late</div><div class="ah">Present</div><div class="ah">Absent</div>
              <div class="av">${attendance.late}</div><div class="av" style="color:#2f855a">${attendance.present}</div><div class="av" style="color:#c0392b">${attendance.absent}</div>
            </div>
          </div>
          <div class="blk">
            <div class="blk-h">SCORE SUMMARY</div>
            <div class="sl"><span class="l">Total Obtainable</span><span class="v">${maxObtainable}</span></div>
            <div class="sl"><span class="l">Total Obtained</span><span class="v">${grandTotal}</span></div>
            <div class="sl"><span class="l">Average Pct</span><span class="v">${overallMean}%</span></div>
            <div class="sl"><span class="l">Class Position</span><span class="v">${ord(myYearRnk)} of ${args.classSize}</span></div>
            <div class="sl"><span class="l">Students in Class</span><span class="v">${args.classSize}</span></div>
            <div class="sl"><span class="l">Exam Board</span><span class="v">${p.examBoard}</span></div>
          </div>
        </div>

        <table class="acad">
          <colgroup>
            <col style="width:14.5%"><col style="width:3%">
            <col style="width:2.6%"><col style="width:2.6%"><col style="width:2.6%"><col style="width:3.3%"><col style="width:3.3%"><col style="width:2.8%">
            <col style="width:2.6%"><col style="width:2.6%"><col style="width:2.6%"><col style="width:3.3%"><col style="width:3.3%"><col style="width:2.8%">
            <col style="width:2.6%"><col style="width:2.6%"><col style="width:2.6%"><col style="width:3.3%"><col style="width:3.3%"><col style="width:2.8%">
            <col style="width:4%"><col style="width:4%"><col style="width:3.2%"><col style="width:4.5%"><col style="width:11%">
          </colgroup>
          <thead>
            <tr>
              <th rowspan="2" class="subj" style="color:#fff;background:var(--primary)">SUBJECT</th><th rowspan="2">MAX</th>
              <th colspan="6" class="grp">FIRST TERM</th><th colspan="6" class="grp">SECOND TERM</th><th colspan="6" class="grp">THIRD TERM</th><th colspan="5" class="grp">YEARLY SUMMARY</th>
            </tr>
            <tr>
              <th class="grp">T1</th><th>T2</th><th>EX</th><th>TOT</th><th>MN</th><th>RNK</th>
              <th class="grp">T1</th><th>T2</th><th>EX</th><th>TOT</th><th>MN</th><th>RNK</th>
              <th class="grp">T1</th><th>T2</th><th>EX</th><th>TOT</th><th>MN</th><th>RNK</th>
              <th class="grp">TOT</th><th>MEAN</th><th>RNK</th><th>GRD</th><th>REM</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}${targetSubjects.length ? totalsRow : ''}</tbody>
        </table>

        ${keyBar}

        <div class="panels">
          <div class="panel">
            <div class="panel-h">AFFECTIVE TRAITS</div>
            ${traitRow('Attentiveness', ev?.attentiveness || 0)}${traitRow('Attitude to Work', ev?.attitude || 0)}${traitRow('Cooperation', ev?.cooperation || 0)}${traitRow('Neatness', ev?.neatness || 0)}${traitRow('Politeness', ev?.politeness || 0)}${traitRow('Punctuality', ev?.punctuality || 0)}
          </div>
          <div class="panel">
            <div class="panel-h">PSYCHOMOTOR SKILLS</div>
            ${skillRow('Drawing & Painting', ev?.drawing_painting || 0)}${skillRow('Handling of Tools', ev?.handling_tools || 0)}${skillRow('Games & Sports', ev?.games || 0)}${skillRow('Handwriting', ev?.handwriting || 0)}${skillRow('Music', ev?.music || 0)}${skillRow('Verbal Fluency', ev?.verbal_fluency || 0)}
          </div>
        </div>

        <div class="bottom">
          <div class="sigs">
            <div class="sig"><div class="lbl">Teacher's Remarks</div><div class="val">${esc(teacherRemark)}</div><div class="line">Sign &amp; Date: ____________________</div></div>
            <div class="sig"><div class="lbl">Principal's Remarks</div><div class="val">&nbsp;</div><div class="line">Sign &amp; Stamp: ____________________</div></div>
          </div>
          <div class="foot">
            <div class="promo">PROMOTION STATUS: ${esc(promotion)}</div>
            <div class="auth">
              <img class="qr" src="${qrUrl}" alt="verify"/>
              <div class="cap">SCAN TO VERIFY</div>
            </div>
          </div>
          <div class="legalese">Official Digital Document • Securely Generated by EduSalone on ${new Date().toLocaleString()} • Any physical or digital alteration invalidates this statement.</div>
        </div>
      </div>
    </div>
  </div>
  </body></html>`;
}