import React, { useState, useEffect } from "react";

const SUPA_URL = "https://wwyydqetukknnysoasuf.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3eXlkcWV0dWtrbm55c29hc3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0OTgyNjQsImV4cCI6MjA5MDA3NDI2NH0.lqzppUPhn-cRv3YzAYn4cUQLUoOeiK-nuVmUVGyrTMs";
const SID = "default";
const MW = 10320;
const PASS = "2488";
const WAGE_PASS = "880307";
const COLORS = ["#E03131","#1971C2","#F08C00","#2F9E44","#9C36B5","#D6336C","#E67700","#0B7285","#862E9C","#C92A2A","#364FC7","#087F5B","#E8590C","#5C940D","#1098AD","#C2255C"];
const DN = ["일","월","화","수","목","금","토"];

let isCloud = false;

function dkF(y, m, d) { return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
function mI(y, m) { return { last: new Date(y, m + 1, 0).getDate(), start: new Date(y, m, 1).getDay() }; }
function hC(s, e, b) { const [sh, sm] = s.split(":").map(Number), [eh, em] = e.split(":").map(Number); let m = (eh * 60 + em) - (sh * 60 + sm); if (m < 0) m += 1440; m -= (b || 0); return Math.max(0, m / 60); }
function wK(y, m, d) { const dt = new Date(y, m, d), sun = new Date(dt); sun.setDate(dt.getDate() - dt.getDay()); return `${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(2, "0")}-${String(sun.getDate()).padStart(2, "0")}`; }
function maskSSN(s) { if (!s) return ""; return s.length > 7 ? s.slice(0, 8) + "******" : s; }

function exportPDF(emps, shifts, yr, mo, bonuses) {
  const { last } = mI(yr, mo);
  const gS = (eid, ds) => shifts.filter(s => s.emp_id === eid && s.date === ds);
  const fmt = n => n.toLocaleString();
  const today = new Date();
  const docDate = `${today.getFullYear()}. ${String(today.getMonth()+1).padStart(2,'0')}. ${String(today.getDate()).padStart(2,'0')}`;
  const bKey = (eid) => `${eid}|${yr}-${mo + 1}`;

  // 급여 계산
  const wageData = emps.map(emp => {
    let tH = 0, days = 0; const wm = {};
    for (let d = 1; d <= last; d++) {
      const shs = gS(emp.id, dkF(yr, mo, d)); if (shs.length === 0) continue;
      days++;
      shs.forEach(sh => { const hrs = hC(sh.start_time, sh.end_time, sh.break_min); tH += hrs; const wk = wK(yr, mo, d); wm[wk] = (wm[wk] || 0) + hrs; });
    }
    const base = Math.round(tH * emp.wage);
    let weekly = 0; Object.values(wm).forEach(wh => { if (wh >= 15) weekly += Math.round((wh / 5) * emp.wage); });
    const bonus = Number((bonuses || {})[bKey(emp.id)]) || 0;
    return { name: emp.name, wage: emp.wage, phone: emp.phone, bank: emp.bank, days, tH: Math.round(tH * 10) / 10, base, weekly, bonus, total: base + weekly + bonus };
  });
  const grand = wageData.reduce((s, d) => s + d.total, 0);

  // 시간표: 근무 있는 날만
  let schedRows = '';
  for (let d = 1; d <= last; d++) {
    const dow = new Date(yr, mo, d).getDay();
    const hasAny = emps.some(emp => gS(emp.id, dkF(yr, mo, d)).length > 0);
    if (!hasAny) continue;
    let empCells = emps.map(emp => {
      const shs = gS(emp.id, dkF(yr, mo, d));
      return `<td class="tc">${shs.length > 0 ? shs.map(sh => sh.start_time + '~' + sh.end_time).join('<br>') : '-'}</td>`;
    }).join('');
    schedRows += `<tr><td class="tc" style="font-weight:600;color:${dow===0?'#D46B5A':dow===6?'#5B8AC4':'#111'}">${mo+1}/${d} (${DN[dow]})</td>${empCells}</tr>`;
  }

  // 급여 행
  let wageRows = wageData.map(d => `
    <tr>
      <td class="tc" style="font-weight:600">${d.name}</td>
      <td class="tc">${d.days}일</td>
      <td class="tc">${d.tH}시간</td>
      <td class="tr">${fmt(d.base)}원</td>
      <td class="tr">${fmt(d.weekly)}원</td>
      <td class="tr">${d.bonus > 0 ? fmt(d.bonus) + '원' : '-'}</td>
      <td class="tr" style="font-weight:800;font-size:13px">${fmt(d.total)}원</td>
    </tr>
  `).join('');

  const empHeaders = emps.map(e => `<th class="th2">${e.name}</th>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>급여 리포트 ${yr}.${mo+1}</title>
<style>
  @page { size: A4; margin: 20mm 24mm; }
  @media print { #printBar, #printBar + div { display: none !important; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Noto Sans KR', 'Malgun Gothic', sans-serif; color: #111; font-size: 12px; line-height: 1.5; }

  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 3px solid #111; margin-bottom: 24px; }
  .header h1 { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
  .header .meta { text-align: right; font-size: 11px; color: #666; line-height: 1.6; }

  .title-section { margin-bottom: 20px; }
  .title-section h2 { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
  .title-section p { font-size: 12px; color: #888; }

  .info-box { border: 2px solid #111; padding: 16px 20px; margin-bottom: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .info-box .label { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .info-box .value { font-size: 13px; font-weight: 700; color: #111; }

  .section-title { font-size: 14px; font-weight: 800; padding: 8px 0; margin: 24px 0 12px; border-bottom: 2px solid #E0E0E0; display: flex; align-items: center; gap: 8px; }
  .section-title .bar { width: 4px; height: 18px; background: #111; display: inline-block; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 12px; }
  th { padding: 8px 10px; background: #111; color: #fff; font-size: 11px; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.3px; }
  .th2 { padding: 8px 10px; background: #F5F5F5; color: #111; font-size: 11px; font-weight: 700; text-align: center; border: 1px solid #DDD; }
  td { padding: 7px 10px; border: 1px solid #E0E0E0; font-size: 12px; }
  .tc { text-align: center; }
  .tr { text-align: right; }
  tr:nth-child(even) { background: #FAFAFA; }

  .grand-box { margin-top: 16px; padding: 14px 20px; background: #111; color: #fff; display: flex; justify-content: space-between; align-items: center; }
  .grand-box .label { font-size: 14px; font-weight: 700; }
  .grand-box .amount { font-size: 22px; font-weight: 900; }

  .note { margin-top: 14px; font-size: 10px; color: #999; line-height: 1.7; }
  .footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #DDD; font-size: 10px; color: #AAA; text-align: center; }

  .emp-grid { display: grid; grid-template-columns: repeat(${Math.min(emps.length, 3)}, 1fr); gap: 10px; margin-bottom: 24px; }
  .emp-card { border: 1px solid #E0E0E0; padding: 12px 14px; border-radius: 6px; }
  .emp-card .name { font-size: 14px; font-weight: 800; margin-bottom: 6px; }
  .emp-card .detail { font-size: 11px; color: #666; line-height: 1.8; }
</style></head><body>

<div class="header">
  <h1>팔팔너구리해장 신당본점</h1>
  <div class="meta">
    <strong>급여 리포트</strong><br>
    DATE: ${docDate}
  </div>
</div>

<div class="title-section">
  <h2>${yr}년 ${mo+1}월 급여 리포트</h2>
  <p>직원 ${emps.length}명 · 기준 시급 ${fmt(MW)}원</p>
</div>

<div class="info-box">
  <div><div class="label">기간</div><div class="value">${yr}. ${String(mo+1).padStart(2,'0')}. 01 ~ ${yr}. ${String(mo+1).padStart(2,'0')}. ${last}</div></div>
  <div><div class="label">총 인건비</div><div class="value">${fmt(grand)}원</div></div>
  <div><div class="label">직원 수</div><div class="value">${emps.length}명</div></div>
  <div><div class="label">출력일</div><div class="value">${docDate}</div></div>
</div>

<div class="section-title"><span class="bar"></span> 1. 직원 정보</div>
<div class="emp-grid">
  ${emps.map(e => `
    <div class="emp-card">
      <div class="name">${e.name}</div>
      <div class="detail">
        시급: ${fmt(e.wage)}원<br>
        ${e.phone ? '연락처: ' + e.phone + '<br>' : ''}
        ${e.bank ? '계좌: ' + e.bank : ''}
      </div>
    </div>
  `).join('')}
</div>

<div class="section-title"><span class="bar"></span> 2. 월간 시간표</div>
<table>
  <tr><th style="width:90px">날짜</th>${empHeaders}</tr>
  ${schedRows}
</table>
${schedRows === '' ? '<p style="text-align:center;color:#AAA;padding:16px">등록된 근무일정이 없습니다</p>' : ''}

<div class="section-title"><span class="bar"></span> 3. 급여 계산</div>
<table>
  <tr><th>이름</th><th>근무일수</th><th>총 근무시간</th><th>기본급</th><th>주휴수당</th><th>기타수당</th><th>총 급여</th></tr>
  ${wageRows}
</table>

${grand > 0 ? `<div class="grand-box"><span class="label">전체 인건비 합계</span><span class="amount">${fmt(grand)}원</span></div>` : ''}

<div class="note">
  * 기본급 = 총 근무시간 × 시급<br>
  * 주휴수당 = 일~토 한 주 15시간 이상 근무 시 (주간시간 ÷ 5 × 시급)<br>
  * ${yr}년 최저시급: ${fmt(MW)}원
</div>

<div class="footer">팔팔너구리해장 신당본점 · ${docDate} 출력</div>
</body></html>`;

  const printBar = `<div id="printBar" style="position:fixed;top:0;left:0;right:0;background:#2D2016;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;z-index:9999">
    <span style="color:#fff;font-size:14px;font-weight:700">급여 리포트</span>
    <div style="display:flex;gap:8px">
      <button onclick="document.getElementById('printBar').style.display='none';window.print();setTimeout(()=>document.getElementById('printBar').style.display='flex',500)" style="padding:8px 16px;background:#C4956A;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">🖨 인쇄 / PDF 저장</button>
      <button onclick="window.close()" style="padding:8px 16px;background:#555;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer">✕ 닫기</button>
    </div>
  </div><div style="height:50px"></div>`;

  const finalHtml = html.replace('<body>', '<body>' + printBar);

  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.write(finalHtml);
    printWin.document.close();
  }
}

function exportSchedulePDF(emps, shifts, yr, mo) {
  const { last } = mI(yr, mo);
  const gS = (eid, ds) => shifts.filter(s => s.emp_id === eid && s.date === ds);
  const DWKS = ["일","월","화","수","목","금","토"];

  // 각 직원별 월 총시간
  const empTotals = emps.map(emp => {
    let t = 0;
    for (let d = 1; d <= last; d++) {
      const sh = gS(emp.id, dkF(yr, mo, d));
      if (sh) t += hC(sh.start_time, sh.end_time, sh.break_min);
    }
    return { name: emp.name, total: Math.round(t * 10) / 10 };
  });

  // 날짜 헤더
  let dateHeaders = '';
  let dowHeaders = '';
  for (let d = 1; d <= last; d++) {
    const dow = new Date(yr, mo, d).getDay();
    const isSun = dow === 0, isSat = dow === 6;
    const bg = isSun ? '#FFF0EE' : isSat ? '#EEF3FF' : '#fff';
    const color = isSun ? '#D46B5A' : isSat ? '#5B8AC4' : '#333';
    dateHeaders += `<th class="dc" style="background:${bg};color:${color};font-weight:800">${d}</th>`;
    dowHeaders += `<th class="dc" style="background:${bg};color:${color};font-size:10px;font-weight:600">${DWKS[dow]}</th>`;
  }

  // 시간 포맷 (09:00 → 9시)
  const fmtTime = (t) => t;

  // 직원별 행 (출근시간 + 마감시간)
  let empRows = emps.map((emp, idx) => {
    let cells = '';
    for (let d = 1; d <= last; d++) {
      const dow = new Date(yr, mo, d).getDay();
      const shs = gS(emp.id, dkF(yr, mo, d));
      const isSun = dow === 0, isSat = dow === 6;
      const bg = shs.length > 0 ? (isSun || isSat ? '#FFF3E0' : '#FFF8E1') : (isSun ? '#FFF8F6' : isSat ? '#F5F8FF' : '#fff');
      if (shs.length > 0) {
        cells += `<td class="dc" style="background:${bg};font-size:9px;line-height:1.5;padding:2px 1px">${shs.map(sh => `<strong style="font-size:10px">${fmtTime(sh.start_time)}</strong><span style="color:#999">~${fmtTime(sh.end_time)}</span>`).join('<br>')}</td>`;
      } else {
        cells += `<td class="dc" style="background:${bg}"></td>`;
      }
    }
    const total = empTotals[idx].total;
    const bgRow = idx % 2 === 0 ? '#FFFDF9' : '#FFF';
    return `<tr style="background:${bgRow}"><td class="name-cell">${emp.name}</td>${cells}<td class="dc" style="font-weight:800;font-size:13px;background:#F5F0E8">${total}</td></tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>스케줄표 ${yr}.${mo+1}</title>
<style>
  @page { size: A4 landscape; margin: 14mm 20mm; }
  @media print { #printBar, #printBar + div { display: none !important; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Noto Sans KR', 'Malgun Gothic', sans-serif; color: #111; font-size: 11px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 3px solid #111; }
  .header h1 { font-size: 18px; font-weight: 900; }
  .header .sub { font-size: 12px; color: #888; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid #DDD; padding: 4px 2px; text-align: center; vertical-align: middle; }
  .dc { min-width: 28px; }
  .name-cell { text-align: center; padding: 6px 4px; font-weight: 700; font-size: 11px; white-space: nowrap; background: #F9F6F0; width: 60px; min-width: 60px; max-width: 60px; }
  .footer { margin-top: 10px; font-size: 10px; color: #AAA; text-align: center; }
</style></head><body>

<div class="header">
  <div>
    <h1>팔팔너구리해장 신당본점</h1>
    <span class="sub">${yr}년 ${mo + 1}월 근무 스케줄 · 직원 ${emps.length}명</span>
  </div>
  <div style="text-align:right;font-size:11px;color:#888">
    출력일: ${new Date().toLocaleDateString('ko-KR')}
  </div>
</div>

<table>
  <thead>
    <tr><th class="name-cell" style="background:#2D2016;color:#fff">이름</th>${dateHeaders}<th class="dc" style="background:#2D2016;color:#fff;font-weight:800">합계</th></tr>
    <tr><th class="name-cell" style="background:#F5F0E8"></th>${dowHeaders}<th class="dc" style="background:#F5F0E8;font-size:10px">시간</th></tr>
  </thead>
  <tbody>
    ${empRows}
  </tbody>
</table>

<div class="footer">팔팔너구리해장 신당본점 · 근무시간은 휴게시간 제외 기준</div>
</body></html>`;

  const printBar = `<div id="printBar" style="position:fixed;top:0;left:0;right:0;background:#2D2016;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;z-index:9999">
    <span style="color:#fff;font-size:14px;font-weight:700">스케줄표</span>
    <div style="display:flex;gap:8px">
      <button onclick="document.getElementById('printBar').style.display='none';window.print();setTimeout(()=>document.getElementById('printBar').style.display='flex',500)" style="padding:8px 16px;background:#C4956A;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">🖨 인쇄 / PDF 저장</button>
      <button onclick="window.close()" style="padding:8px 16px;background:#555;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer">✕ 닫기</button>
    </div>
  </div><div style="height:50px"></div>`;

  const finalHtml = html.replace('<body>', '<body>' + printBar);

  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.write(finalHtml);
    printWin.document.close();
  }
}

async function api(method, table, opts) {
  const { body, query } = opts || {};
  let url = `${SUPA_URL}/rest/v1/${table}`;
  if (query) url += `?${query}`;
  const h = { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" };
  if (method === "POST" || method === "PATCH") h["Prefer"] = "return=representation";
  const res = await fetch(url, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error("api error");
  if (method === "DELETE") return true;
  return res.json();
}

async function localGet(k, fb) {
  try { if (window.storage) { const r = await window.storage.get(k); if (r && r.value) return JSON.parse(r.value); } } catch {}
  return fb;
}
async function localSet(k, v) {
  try { if (window.storage) await window.storage.set(k, JSON.stringify(v)); } catch {}
}

function Inp({ label, ...p }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#7A6B55", fontWeight: 500 }}>
      {label}
      <input {...p} style={{ padding: "9px 12px", border: "1.5px solid #E0D5C5", borderRadius: 8, fontSize: 14, fontFamily: "inherit", color: "#2D2016", background: "#FFFDF9", outline: "none", ...(p.style || {}) }} />
    </label>
  );
}

function B({ children, primary, danger, small, ghost, disabled, ...p }) {
  const bg = danger ? "#D95550" : primary ? "#2D2016" : ghost ? "transparent" : "#EDE4D8";
  const fg = danger || primary ? "#FFF" : ghost ? "#8B7355" : "#5C4A35";
  return (
    <button {...p} disabled={disabled} style={{ padding: small ? "6px 12px" : "10px 18px", border: ghost ? "1.5px solid #E0D5C5" : "none", borderRadius: 8, fontFamily: "inherit", fontWeight: 600, fontSize: small ? 12 : 14, cursor: disabled ? "default" : "pointer", background: bg, color: fg, opacity: disabled ? 0.4 : 1, transition: "all .15s", whiteSpace: "nowrap", ...(p.style || {}) }}>
      {children}
    </button>
  );
}

function EmpPanel({ emps, setEmps, sel, setSel, persist }) {
  const [mode, setMode] = useState(null);
  const [f, setF] = useState({ name: "", ssn: "", phone: "", bank: "", wage: MW });
  const [busy, setBusy] = useState(false);

  const doSave = async () => {
    if (!f.name.trim() || busy) return;
    setBusy(true);
    let nx;
    if (mode === "add") {
      const id = "e" + Date.now(), color = COLORS[emps.length % COLORS.length];
      const emp = { id, store_id: SID, name: f.name.trim(), color, wage: f.wage, ssn: f.ssn, phone: f.phone, bank: f.bank };
      if (isCloud) { try { await api("POST", "employees", { body: emp }); } catch {} }
      nx = [...emps, emp];
      setSel(id);
    } else {
      const upd = { name: f.name.trim(), wage: f.wage, ssn: f.ssn, phone: f.phone, bank: f.bank };
      if (isCloud) { try { await api("PATCH", "employees", { query: `id=eq.${mode}`, body: upd }); } catch {} }
      nx = emps.map(e => e.id === mode ? { ...e, ...upd } : e);
    }
    setEmps(nx); localSet("sm:emp", nx);
    setBusy(false); setMode(null);
  };

  const doDelete = async (id) => {
    setBusy(true);
    if (isCloud) { try { await api("DELETE", "employees", { query: `id=eq.${id}` }); } catch {} }
    const nx = emps.filter(e => e.id !== id);
    setEmps(nx); localSet("sm:emp", nx);
    if (sel === id) setSel(nx[0]?.id || null);
    setBusy(false); setMode(null);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        {emps.map(emp => (
          <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <button onClick={() => setSel(emp.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, cursor: "pointer", border: sel === emp.id ? `2px solid ${emp.color}` : "2px solid transparent", background: sel === emp.id ? emp.color + "18" : "#F5F0E8", fontFamily: "inherit", fontWeight: 600, fontSize: 13, color: sel === emp.id ? emp.color : "#8B7355" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: emp.color }} />{emp.name}
            </button>
            <button onClick={() => { setF({ name: emp.name, ssn: emp.ssn || "", phone: emp.phone || "", bank: emp.bank || "", wage: emp.wage }); setMode(emp.id); }} style={{ background: "none", border: "none", color: "#C4B99A", cursor: "pointer", fontSize: 11, padding: 2 }}>✏️</button>
          </div>
        ))}
        <button onClick={() => { setF({ name: "", ssn: "", phone: "", bank: "", wage: MW }); setMode("add"); }} style={{ padding: "7px 14px", borderRadius: 20, border: "2px dashed #D5C9B8", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 13, color: "#B5A48B" }}>+ 직원 추가</button>
      </div>

      {mode && (
        <div style={{ background: "#FFFDF9", borderRadius: 14, border: "1px solid #EBE2D5", padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#2D2016", marginBottom: 12 }}>{mode === "add" ? "새 직원 추가" : "직원 정보 수정"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <Inp label="이름 *" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} placeholder="홍길동" />
            <Inp label="주민번호" value={f.ssn} onChange={e => setF(p => ({ ...p, ssn: e.target.value }))} placeholder="000000-0000000" />
            <Inp label="연락처" value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))} placeholder="010-0000-0000" />
            <Inp label="계좌번호" value={f.bank} onChange={e => setF(p => ({ ...p, bank: e.target.value }))} placeholder="은행 계좌번호" />
            <Inp label="시급" type="number" value={f.wage} onChange={e => setF(p => ({ ...p, wage: Number(e.target.value) || 0 }))} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <B primary onClick={doSave} disabled={busy}>{busy ? "저장 중..." : mode === "add" ? "추가" : "수정 완료"}</B>
            {mode !== "add" && <B danger onClick={() => doDelete(mode)} disabled={busy}>삭제</B>}
            <B ghost onClick={() => setMode(null)}>취소</B>
          </div>
        </div>
      )}

      {sel && !mode && (() => {
        const emp = emps.find(e => e.id === sel); if (!emp) return null;
        return (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: "10px 16px", background: "#F7F2EA", borderRadius: 10, fontSize: 12, color: "#8B7355" }}>
            {emp.phone && <span>📞 {emp.phone}</span>}
            {emp.ssn && <span>🪪 {maskSSN(emp.ssn)}</span>}
            {emp.bank && <span>🏦 {emp.bank}</span>}
            <span>💰 {emp.wage.toLocaleString()}원</span>
          </div>
        );
      })()}
    </div>
  );
}

function ScheduleTab({ emps, shifts, setShifts, sel }) {
  const now = new Date();
  const [yr, setYr] = useState(now.getFullYear());
  const [mo, setMo] = useState(now.getMonth());
  const [ec, setEc] = useState(null);
  const [ss, setSs] = useState("09:00");
  const [se, setSe] = useState("18:00");
  const [sb, setSb] = useState("60");
  const [busy, setBusy] = useState(false);

  const { last, start } = mI(yr, mo);
  const cells = [];
  for (let i = 0; i < start; i++) cells.push(null);
  for (let d = 1; d <= last; d++) cells.push(d);
  const todayDK = dkF(now.getFullYear(), now.getMonth(), now.getDate());

  const pM = () => { if (mo === 0) { setYr(y => y - 1); setMo(11); } else setMo(m => m - 1); };
  const nM = () => { if (mo === 11) { setYr(y => y + 1); setMo(0); } else setMo(m => m + 1); };
  const gAll = (eid, ds) => shifts.filter(s => s.emp_id === eid && s.date === ds);

  const saveS = async (day) => {
    if (!sel || busy) return;
    setBusy(true);
    const ds = dkF(yr, mo, day);
    const ns = { store_id: SID, emp_id: sel, date: ds, start_time: ss, end_time: se, break_min: Number(sb) || 0 };
    if (isCloud) { try { await api("POST", "shifts", { body: ns }); } catch {} }
    const nx = [...shifts, ns];
    setShifts(nx); localSet("sm:sh", nx);
    setBusy(false); setEc(null);
  };

  const rmS = async (day, startTime) => {
    if (busy) return;
    setBusy(true);
    const ds = dkF(yr, mo, day);
    if (isCloud) { try { await api("DELETE", "shifts", { query: `emp_id=eq.${sel}&date=eq.${ds}&start_time=eq.${startTime}` }); } catch {} }
    let found = false;
    const nx = shifts.filter(s => {
      if (!found && s.emp_id === sel && s.date === ds && s.start_time === startTime) { found = true; return false; }
      return true;
    });
    setShifts(nx); localSet("sm:sh", nx);
    setBusy(false); setEc(null);
  };

  const rmAllS = async (day) => {
    if (busy) return;
    setBusy(true);
    const ds = dkF(yr, mo, day);
    if (isCloud) { try { await api("DELETE", "shifts", { query: `emp_id=eq.${sel}&date=eq.${ds}` }); } catch {} }
    const nx = shifts.filter(s => !(s.emp_id === sel && s.date === ds));
    setShifts(nx); localSet("sm:sh", nx);
    setBusy(false); setEc(null);
  };

  const copyW = async () => {
    if (!sel || busy) return;
    setBusy(true);
    let nx = [...shifts];
    for (let d = 1; d <= last; d++) {
      const src = d - 7; if (src < 1) continue;
      const sd = dkF(yr, mo, src), dd = dkF(yr, mo, d);
      const srcShifts = nx.filter(s => s.emp_id === sel && s.date === sd);
      const destShifts = nx.filter(s => s.emp_id === sel && s.date === dd);
      if (srcShifts.length > 0 && destShifts.length === 0) {
        for (const ss2 of srcShifts) {
          const ns = { store_id: SID, emp_id: sel, date: dd, start_time: ss2.start_time, end_time: ss2.end_time, break_min: ss2.break_min };
          if (isCloud) { try { await api("POST", "shifts", { body: ns }); } catch {} }
          nx = [...nx, ns];
        }
      }
    }
    setShifts(nx); localSet("sm:sh", nx);
    setBusy(false);
  };

  const mTot = eid => { let t = 0; for (let d = 1; d <= last; d++) { gAll(eid, dkF(yr, mo, d)).forEach(sh => { t += hC(sh.start_time, sh.end_time, sh.break_min); }); } return t; };

  if (!sel) return <div style={{ textAlign: "center", padding: 40, color: "#B5A48B" }}>직원을 선택하거나 추가해주세요</div>;
  const emp = emps.find(e => e.id === sel);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <B ghost small onClick={pM}>◀ 이전</B>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#2D2016" }}>{yr}년 {mo + 1}월</div>
          {emp && <div style={{ fontSize: 12, color: emp.color, fontWeight: 600 }}>{emp.name} · {mTot(sel).toFixed(1)}시간</div>}
        </div>
        <B ghost small onClick={nM}>다음 ▶</B>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <B small ghost onClick={copyW} disabled={busy}>{busy ? "처리 중..." : "📋 지난주 복사"}</B>
        <B small ghost onClick={() => exportSchedulePDF(emps, shifts, yr, mo)}>📅 스케줄표</B>
      </div>
      <div style={{ background: "#FFFDF9", borderRadius: 14, border: "1px solid #EBE2D5", padding: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
          {DN.map((d, i) => <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 700, padding: "6px 0", color: i === 0 ? "#D46B5A" : i === 6 ? "#5B8AC4" : "#8B7355" }}>{d}</div>)}
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const ds = dkF(yr, mo, day), isT = ds === todayDK, dow = new Date(yr, mo, day).getDay();
            const allSh = emps.flatMap(emp => gAll(emp.id, ds).map(sh => ({ emp, sh })));
            const myShifts = gAll(sel, ds);
            const editing = ec === ds;
            return (
              <div key={day} onClick={() => { if (!editing) setEc(ds); }}
                style={{ minHeight: 72, padding: 4, borderRadius: 8, cursor: "pointer", border: isT ? "2px solid #C4956A" : "1.5px solid #F0EBE3", background: editing ? "#FFF8ED" : "#FFFDF9" }}>
                <div style={{ fontSize: 12, fontWeight: isT ? 800 : 500, marginBottom: 2, color: dow === 0 ? "#D46B5A" : dow === 6 ? "#5B8AC4" : "#2D2016" }}>{day}</div>
                {editing ? (
                  <div onClick={e => e.stopPropagation()} style={{ fontSize: 11 }}>
                    {myShifts.length > 0 && (
                      <div style={{ marginBottom: 4 }}>
                        {myShifts.map((sh, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, padding: "2px 4px", background: "#F0EBE3", borderRadius: 3, marginBottom: 2 }}>
                            <span>{sh.start_time}~{sh.end_time} ({hC(sh.start_time, sh.end_time, sh.break_min)}h)</span>
                            <button onClick={() => rmS(day, sh.start_time)} style={{ background: "none", border: "none", color: "#D95550", cursor: "pointer", fontSize: 10, padding: 0 }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 2, marginBottom: 3 }}>
                      <input type="time" value={ss} onChange={e => setSs(e.target.value)} style={{ width: "48%", fontSize: 11, border: "1px solid #DDD", borderRadius: 4, padding: 3, fontFamily: "inherit" }} />
                      <input type="time" value={se} onChange={e => setSe(e.target.value)} style={{ width: "48%", fontSize: 11, border: "1px solid #DDD", borderRadius: 4, padding: 3, fontFamily: "inherit" }} />
                    </div>
                    <div style={{ display: "flex", gap: 2, alignItems: "center", marginBottom: 3 }}>
                      <span style={{ color: "#AAA", fontSize: 10 }}>휴게</span>
                      <select value={sb} onChange={e => setSb(e.target.value)} style={{ fontSize: 11, border: "1px solid #DDD", borderRadius: 4, padding: "2px 4px", fontFamily: "inherit", background: "#fff" }}>
                        <option value="30">30분</option>
                        <option value="60">60분</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 3 }}>
                      <button onClick={() => saveS(day)} disabled={busy} style={{ flex: 1, background: "#2D2016", color: "#FFF", border: "none", borderRadius: 4, fontSize: 10, padding: "4px 0", cursor: "pointer", fontFamily: "inherit" }}>{busy ? "..." : "+ 추가"}</button>
                      {myShifts.length > 0 && <button onClick={() => rmAllS(day)} style={{ background: "#F5E0DE", color: "#D46B5A", border: "none", borderRadius: 4, fontSize: 10, padding: "4px 6px", cursor: "pointer", fontFamily: "inherit" }}>전체삭제</button>}
                      <button onClick={() => setEc(null)} style={{ background: "#EEE", color: "#999", border: "none", borderRadius: 4, fontSize: 10, padding: "4px 6px", cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {allSh.map(({ emp, sh }, idx) => {
                      const hrs = hC(sh.start_time, sh.end_time, sh.break_min);
                      return (
                        <div key={`${emp.id}-${idx}`} style={{ fontSize: 10, padding: "2px 4px", borderRadius: 4, background: emp.color + "20", color: emp.color, fontWeight: 600, border: emp.id === sel ? `1.5px solid ${emp.color}` : "none", overflow: "hidden", lineHeight: 1.4, wordBreak: "break-all" }}>
                          <strong>{emp.name}</strong> {sh.start_time}~{sh.end_time}
                          <span style={{ fontSize: 9, opacity: 0.7 }}> ({hrs}h)</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WageTab({ emps, shifts }) {
  const now = new Date();
  const [yr, setYr] = useState(now.getFullYear());
  const [mo, setMo] = useState(now.getMonth());
  const [bonuses, setBonuses] = useState({});
  const { last } = mI(yr, mo);
  const pM = () => { if (mo === 0) { setYr(y => y - 1); setMo(11); } else setMo(m => m - 1); };
  const nM = () => { if (mo === 11) { setYr(y => y + 1); setMo(0); } else setMo(m => m + 1); };
  const gS = (eid, ds) => shifts.filter(s => s.emp_id === eid && s.date === ds);

  // 보너스 로드 (Supabase shifts 테이블 활용)
  useEffect(() => {
    (async () => {
      if (isCloud) {
        try {
          const data = await api("GET", "shifts", { query: `store_id=eq.bonus&order=date.asc` });
          if (data) {
            const b = {};
            data.forEach(r => { b[`${r.emp_id}|${r.date}`] = Number(r.start_time) || 0; });
            setBonuses(b);
          }
        } catch {}
      } else {
        try { const b = localStorage.getItem("sm:bonus"); if (b) setBonuses(JSON.parse(b)); } catch {}
      }
    })();
  }, []);

  const bonusKey = (empId) => `${empId}|${yr}-${mo + 1}`;
  const getBonus = (empId) => Number(bonuses[bonusKey(empId)]) || 0;
  const setBonus = async (empId, val) => {
    const bk = bonusKey(empId);
    const nb = { ...bonuses, [bk]: Number(val) || 0 };
    setBonuses(nb);
    try { localStorage.setItem("sm:bonus", JSON.stringify(nb)); } catch {}
    if (isCloud) {
      const dateKey = `${yr}-${mo + 1}`;
      try {
        await api("DELETE", "shifts", { query: `store_id=eq.bonus&emp_id=eq.${empId}&date=eq.${dateKey}` });
        if (Number(val) > 0) {
          await api("POST", "shifts", { body: { store_id: "bonus", emp_id: empId, date: dateKey, start_time: String(val), end_time: "0", break_min: 0 } });
        }
      } catch {}
    }
  };

  const calc = emp => {
    let tH = 0, days = 0; const wm = {};
    for (let d = 1; d <= last; d++) {
      const shs = gS(emp.id, dkF(yr, mo, d)); if (shs.length === 0) continue;
      days++;
      shs.forEach(sh => { const hrs = hC(sh.start_time, sh.end_time, sh.break_min); tH += hrs; const wk = wK(yr, mo, d); wm[wk] = (wm[wk] || 0) + hrs; });
    }
    const base = Math.round(tH * emp.wage);
    let weekly = 0; Object.values(wm).forEach(wh => { if (wh >= 15) weekly += Math.round((wh / 5) * emp.wage); });
    const bonus = getBonus(emp.id);
    return { tH: Math.round(tH * 10) / 10, days, base, weekly, bonus, total: base + weekly + bonus };
  };

  let grand = 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <B ghost small onClick={pM}>◀</B>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#2D2016" }}>{yr}년 {mo + 1}월</span>
        <B ghost small onClick={nM}>▶</B>
      </div>
      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <B small ghost onClick={() => exportSchedulePDF(emps, shifts, yr, mo)}>📅 스케줄표</B>
        <B small ghost onClick={() => exportPDF(emps, shifts, yr, mo, bonuses)}>💰 급여 리포트</B>
      </div>
      {emps.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#B5A48B" }}>직원을 먼저 추가해주세요</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {emps.map(emp => {
            const d = calc(emp); grand += d.total;
            return (
              <div key={emp.id} style={{ background: "#FFFDF9", borderRadius: 14, border: "1px solid #EBE2D5", padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: emp.color, display: "inline-block" }} />
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#2D2016" }}>{emp.name}</span>
                  <span style={{ fontSize: 12, color: "#B5A48B" }}>시급 {emp.wage.toLocaleString()}원</span>
                </div>
                {d.days === 0 ? <p style={{ color: "#C4B99A", fontSize: 13, margin: 0 }}>등록된 근무일정 없음</p> : (
                  <React.Fragment>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(95px,1fr))", gap: 8, marginBottom: 12 }}>
                      {[{ l: "근무일", v: `${d.days}일` }, { l: "총시간", v: `${d.tH}h` }, { l: "기본급", v: d.base.toLocaleString() }, { l: "주휴수당", v: d.weekly.toLocaleString() }].map(x => (
                        <div key={x.l} style={{ padding: "8px 10px", background: "#F7F2EA", borderRadius: 8 }}>
                          <div style={{ fontSize: 10, color: "#A89878", marginBottom: 2 }}>{x.l}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#2D2016" }}>{x.v}</div>
                        </div>
                      ))}
                      <div style={{ padding: "8px 10px", background: "#EDF7ED", borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: "#6B9E6B", marginBottom: 4 }}>기타수당</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <input type="number" value={getBonus(emp.id) || ""} onChange={e => setBonus(emp.id, e.target.value)}
                            placeholder="0" style={{ width: "100%", fontSize: 13, fontWeight: 700, border: "1px solid #C5DFC5", borderRadius: 4, padding: "2px 6px", fontFamily: "inherit", background: "#FBFFF9", color: "#2D2016", outline: "none" }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: "10px 14px", background: "#2D2016", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#C4956A", fontWeight: 600, fontSize: 13 }}>예상 급여</span>
                      <span style={{ color: "#FFF", fontWeight: 800, fontSize: 20 }}>{d.total.toLocaleString()}원</span>
                    </div>
                  </React.Fragment>
                )}
              </div>
            );
          })}
          {grand > 0 && (
            <div style={{ padding: "14px 18px", background: "#C4956A", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#FFF", fontWeight: 700, fontSize: 14 }}>전체 인건비</span>
              <span style={{ color: "#FFF", fontWeight: 800, fontSize: 22 }}>{grand.toLocaleString()}원</span>
            </div>
          )}
        </div>
      )}
      <div style={{ marginTop: 16, padding: "12px 16px", background: "#F7F2EA", borderRadius: 10, fontSize: 11, color: "#A89878", lineHeight: 1.8 }}>
        <strong>계산 기준</strong> · 실제 일정 기반 · 주휴: 일~토 한 주 15h 이상 시 지급 · 최저시급 {MW.toLocaleString()}원
      </div>
    </div>
  );
}

/* ═══════ 오픈/마감 체크리스트 ═══════ */
function ChecklistTab() {
  const [mode, setMode] = useState("open");
  const [items, setItems] = useState({ open: [], close: [] });
  const [checked, setChecked] = useState({});
  const [newItem, setNewItem] = useState("");
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const todayKey = new Date().toLocaleDateString("ko-KR");

  // 로드: Supabase(cloud) 또는 localStorage(local)
  useEffect(() => {
    (async () => {
      let savedItems = { open: [], close: [] };
      let savedChecks = {};
      if (isCloud) {
        try {
          const data = await api("GET", "shifts", { query: `store_id=eq.checklist` });
          if (data) {
            data.forEach(r => {
              if (r.date === "items") {
                try { savedItems = JSON.parse(r.start_time); } catch {}
              } else if (r.date === "checks") {
                try { savedChecks = JSON.parse(r.start_time); } catch {}
              }
            });
          }
        } catch {}
      } else {
        try { const v = localStorage.getItem("sm:cl-items"); if (v) savedItems = JSON.parse(v); } catch {}
        try { const v = localStorage.getItem("sm:cl-checks"); if (v) savedChecks = JSON.parse(v); } catch {}
      }
      setItems(savedItems);
      if (savedChecks && savedChecks._date === todayKey) {
        setChecked(savedChecks);
      } else {
        setChecked({ _date: todayKey });
      }
      setLoaded(true);
    })();
  }, []);

  const saveItems = async (newItems) => {
    setItems(newItems);
    try { localStorage.setItem("sm:cl-items", JSON.stringify(newItems)); } catch {}
    if (isCloud) {
      try {
        await api("DELETE", "shifts", { query: `store_id=eq.checklist&date=eq.items` });
        await api("POST", "shifts", { body: { store_id: "checklist", emp_id: "system", date: "items", start_time: JSON.stringify(newItems), end_time: "0", break_min: 0 } });
      } catch {}
    }
  };

  const saveChecks = async (newChecks) => {
    setChecked(newChecks);
    try { localStorage.setItem("sm:cl-checks", JSON.stringify(newChecks)); } catch {}
    if (isCloud) {
      try {
        await api("DELETE", "shifts", { query: `store_id=eq.checklist&date=eq.checks` });
        await api("POST", "shifts", { body: { store_id: "checklist", emp_id: "system", date: "checks", start_time: JSON.stringify(newChecks), end_time: "0", break_min: 0 } });
      } catch {}
    }
  };

  const toggleCheck = (id) => {
    const next = { ...checked };
    next[id] ? delete next[id] : (next[id] = true);
    next._date = todayKey;
    saveChecks(next);
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    const id = "cl_" + Date.now();
    const newItems = { ...items, [mode]: [...items[mode], { id, text: newItem.trim() }] };
    saveItems(newItems);
    setNewItem("");
  };

  const removeItem = (id) => {
    const newItems = { ...items, [mode]: items[mode].filter(item => item.id !== id) };
    saveItems(newItems);
  };

  const moveItem = (id, dir) => {
    const list = [...items[mode]];
    const idx = list.findIndex(item => item.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= list.length) return;
    [list[idx], list[newIdx]] = [list[newIdx], list[idx]];
    saveItems({ ...items, [mode]: list });
  };

  const currentItems = items[mode] || [];
  const checkedCount = currentItems.filter(item => checked[item.id]).length;
  const totalCount = currentItems.length;
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <div>
      {/* 오픈/마감 전환 */}
      <div style={{ display: "flex", gap: 3, padding: "4px 5px", background: "rgba(0,0,0,0.03)", borderRadius: 10, marginBottom: 16 }}>
        <button onClick={() => setMode("open")} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 8, background: mode === "open" ? "#E8927C" : "transparent", color: mode === "open" ? "#FFF" : "#8B7355", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}>☀️ 오픈</button>
        <button onClick={() => setMode("close")} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 8, background: mode === "close" ? "#5B6BAC" : "transparent", color: mode === "close" ? "#FFF" : "#8B7355", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}>🌙 마감</button>
      </div>

      {/* 진행률 */}
      <div style={{ background: "#FFFDF9", borderRadius: 14, border: "1px solid #EBE2D5", padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#2D2016" }}>{mode === "open" ? "☀️ 오픈 체크리스트" : "🌙 마감 체크리스트"}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: progress === 100 ? "#5CB85C" : "#C4956A" }}>{checkedCount}/{totalCount}</span>
        </div>
        <div style={{ height: 8, background: "#F0EBE3", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: progress === 100 ? "#5CB85C" : mode === "open" ? "#E8927C" : "#5B6BAC", borderRadius: 4, transition: "width .3s" }} />
        </div>
        {progress === 100 && totalCount > 0 && (
          <div style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: "#5CB85C", fontWeight: 700 }}>✅ 모두 완료!</div>
        )}
      </div>

      {/* 체크리스트 항목 */}
      <div style={{ background: "#FFFDF9", borderRadius: 14, border: "1px solid #EBE2D5", padding: 16, marginBottom: 12 }}>
        {currentItems.length === 0 ? (
          <p style={{ textAlign: "center", color: "#B5A48B", margin: "20px 0" }}>항목을 추가해주세요</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {currentItems.map((item, idx) => {
              const isDone = checked[item.id];
              return (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: isDone ? "#F5FFF5" : "#FFFDF9", borderRadius: 10, border: isDone ? "1.5px solid #C5E8C5" : "1.5px solid #F0EBE3", cursor: "pointer", transition: "all .2s" }}>
                  <div onClick={() => toggleCheck(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, border: isDone ? "2px solid #5CB85C" : "2px solid #D5C9B8", background: isDone ? "#5CB85C" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s" }}>
                      {isDone && <span style={{ color: "#FFF", fontSize: 14, fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 14, color: isDone ? "#A0C4A0" : "#2D2016", textDecoration: isDone ? "line-through" : "none", fontWeight: 500, transition: "all .2s" }}>{item.text}</span>
                  </div>
                  {editing && (
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {idx > 0 && <button onClick={() => moveItem(item.id, -1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 2 }}>↑</button>}
                      {idx < currentItems.length - 1 && <button onClick={() => moveItem(item.id, 1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 2 }}>↓</button>}
                      <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#D95550", padding: 2 }}>✕</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 편집 모드 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <B small ghost={!editing} primary={editing} onClick={() => setEditing(!editing)}>{editing ? "✓ 편집 완료" : "✏️ 항목 편집"}</B>
      </div>

      {editing && (
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem()}
            placeholder="새 항목 입력" style={{ flex: 1, padding: "10px 12px", border: "1.5px solid #E0D5C5", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
          <B primary onClick={addItem}>추가</B>
        </div>
      )}
    </div>
  );
}

/* ═══════ 일일 매장 관리 ═══════ */
const REPORT_EMPTY = { closer: "", sales: "", reviews: "", incoming: "", lunchSales: "", lunchMood: "", dinnerSales: "", dinnerMood: "", trafficSource: "", cashOut: "", cashIn: "", cashTotal: "", cashDiff: "", memo: "" };

function DailyReportTab({ emps }) {
  const [date, setDate] = useState(() => { const d = new Date(); return dkF(d.getFullYear(), d.getMonth(), d.getDate()); });
  const [report, setReport] = useState(REPORT_EMPTY);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const dateObj = new Date(date);
  const dayNames = ["일","월","화","수","목","금","토"];
  const dateDisplay = `${dateObj.getFullYear()}. ${dateObj.getMonth()+1}. ${dateObj.getDate()} (${dayNames[dateObj.getDay()]})`;

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate()-1); setDate(dkF(d.getFullYear(), d.getMonth(), d.getDate())); };
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate()+1); setDate(dkF(d.getFullYear(), d.getMonth(), d.getDate())); };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let data = null;
      if (isCloud) {
        try {
          const res = await api("GET", "shifts", { query: `store_id=eq.daily_report&date=eq.${date}` });
          if (res && res.length > 0) { try { data = JSON.parse(res[0].start_time); } catch {} }
        } catch {}
      }
      if (!data) {
        try { const v = localStorage.getItem(`sm:report:${date}`); if (v) data = JSON.parse(v); } catch {}
      }
      if (!cancelled) { setReport(data || { ...REPORT_EMPTY }); setSaved(false); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [date]);

  const u = (field, val) => { setReport(prev => ({ ...prev, [field]: val })); setSaved(false); };

  const doSave = async () => {
    setLoading(true);
    try { localStorage.setItem(`sm:report:${date}`, JSON.stringify(report)); } catch {}
    if (isCloud) {
      try {
        await api("DELETE", "shifts", { query: `store_id=eq.daily_report&date=eq.${date}` });
        await api("POST", "shifts", { body: { store_id: "daily_report", emp_id: "system", date, start_time: JSON.stringify(report), end_time: "0", break_min: 0 } });
      } catch {}
    }
    setSaved(true); setLoading(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const S = { sec: { background: "#FFFDF9", borderRadius: 14, border: "1px solid #EBE2D5", padding: 16, marginBottom: 12 }, head: { fontSize: 13, fontWeight: 700, color: "#C4956A", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #F0EBE3" }, row: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F5F0E8" }, num: { width: 130, padding: "6px 10px", border: "1.5px solid #E0D5C5", borderRadius: 6, fontSize: 14, fontFamily: "inherit", textAlign: "right", outline: "none", background: "#FFFDF9" }, txt: { width: "100%", padding: "8px 10px", border: "1.5px solid #E0D5C5", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", background: "#FFFDF9", boxSizing: "border-box" } };

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#C4956A" }}>불러오는 중...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <B ghost small onClick={prevDay}>◀ 이전날</B>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#2D2016" }}>{dateDisplay}</div>
          <div style={{ fontSize: 11, color: "#B5A48B" }}>일일 매장 관리</div>
        </div>
        <B ghost small onClick={nextDay}>다음날 ▶</B>
      </div>

      <div style={S.sec}>
        <div style={S.head}>👤 마감자</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["양구", "리우", "병수"].map(name => (
            <button key={name} onClick={() => u("closer", name)} style={{
              padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 13, transition: "all .2s",
              border: report.closer === name ? "2px solid #2D2016" : "2px solid #E0D5C5",
              background: report.closer === name ? "#2D2016" : "#F5F0E8",
              color: report.closer === name ? "#FFF" : "#8B7355"
            }}>
              {report.closer === name ? "✓ " : ""}{name}
            </button>
          ))}
        </div>
      </div>

      <div style={S.sec}><div style={S.head}>💰 매출</div>
        <div style={S.row}><span style={{fontSize:13,color:"#5C4A35",fontWeight:500}}>총 매출</span><div style={{display:"flex",alignItems:"center",gap:4}}><input type="text" inputMode="numeric" value={report.sales} onChange={e=>u("sales",e.target.value.replace(/[^0-9]/g,""))} placeholder="0" style={S.num}/><span style={{fontSize:12,color:"#8B7355"}}>원</span></div></div>
        <div style={S.row}><span style={{fontSize:13,color:"#5C4A35",fontWeight:500}}>영수증 리뷰 수</span><div style={{display:"flex",alignItems:"center",gap:4}}><input type="text" inputMode="numeric" value={report.reviews} onChange={e=>u("reviews",e.target.value.replace(/[^0-9]/g,""))} placeholder="0" style={S.num}/><span style={{fontSize:12,color:"#8B7355"}}>건</span></div></div>
      </div>

      <div style={S.sec}><div style={S.head}>📦 중요 입고</div>
        <textarea value={report.incoming} onChange={e=>u("incoming",e.target.value)} placeholder="예: 우동사리, 쌀, 유부" rows={2} style={S.txt}/>
      </div>

      <div style={S.sec}><div style={S.head}>🏪 매장 분위기</div>
        <div style={S.row}><span style={{fontSize:13,color:"#5C4A35",fontWeight:500}}>점심 매출</span><div style={{display:"flex",alignItems:"center",gap:4}}><input type="text" inputMode="numeric" value={report.lunchSales} onChange={e=>u("lunchSales",e.target.value.replace(/[^0-9]/g,""))} placeholder="0" style={S.num}/><span style={{fontSize:12,color:"#8B7355"}}>만원</span></div></div>
        <div style={{marginBottom:10}}><div style={{fontSize:12,color:"#8B7355",fontWeight:500,marginBottom:4}}>점심 분위기</div><textarea value={report.lunchMood} onChange={e=>u("lunchMood",e.target.value)} placeholder="점심 시간대 분위기를 적어주세요" rows={2} style={S.txt}/></div>
        <div style={S.row}><span style={{fontSize:13,color:"#5C4A35",fontWeight:500}}>저녁 매출</span><div style={{display:"flex",alignItems:"center",gap:4}}><input type="text" inputMode="numeric" value={report.dinnerSales} onChange={e=>u("dinnerSales",e.target.value.replace(/[^0-9]/g,""))} placeholder="0" style={S.num}/><span style={{fontSize:12,color:"#8B7355"}}>만원</span></div></div>
        <div style={{marginBottom:10}}><div style={{fontSize:12,color:"#8B7355",fontWeight:500,marginBottom:4}}>저녁 분위기</div><textarea value={report.dinnerMood} onChange={e=>u("dinnerMood",e.target.value)} placeholder="저녁 시간대 분위기를 적어주세요" rows={2} style={S.txt}/></div>
        <div style={{marginBottom:10}}><div style={{fontSize:12,color:"#8B7355",fontWeight:500,marginBottom:4}}>유입 경로 (추측)</div><textarea value={report.trafficSource} onChange={e=>u("trafficSource",e.target.value)} placeholder="예: 동네 주민, 배달 앱, SNS 등" rows={2} style={S.txt}/></div>
      </div>

      <div style={S.sec}><div style={S.head}>💵 현금 관리</div>
        <div style={S.row}><span style={{fontSize:13,color:"#5C4A35",fontWeight:500}}>현금 지출</span><div style={{display:"flex",alignItems:"center",gap:4}}><input type="text" inputMode="numeric" value={report.cashOut} onChange={e=>u("cashOut",e.target.value.replace(/[^0-9]/g,""))} placeholder="0" style={S.num}/><span style={{fontSize:12,color:"#8B7355"}}>원</span></div></div>
        <div style={S.row}><span style={{fontSize:13,color:"#5C4A35",fontWeight:500}}>현금 매출</span><div style={{display:"flex",alignItems:"center",gap:4}}><input type="text" inputMode="numeric" value={report.cashIn} onChange={e=>u("cashIn",e.target.value.replace(/[^0-9]/g,""))} placeholder="0" style={S.num}/><span style={{fontSize:12,color:"#8B7355"}}>원</span></div></div>
        <div style={S.row}><span style={{fontSize:13,color:"#5C4A35",fontWeight:500}}>총 현금</span><div style={{display:"flex",alignItems:"center",gap:4}}><input type="text" inputMode="numeric" value={report.cashTotal} onChange={e=>u("cashTotal",e.target.value.replace(/[^0-9]/g,""))} placeholder="0" style={S.num}/><span style={{fontSize:12,color:"#8B7355"}}>원</span></div></div>
        <div style={S.row}><span style={{fontSize:13,color:"#5C4A35",fontWeight:500}}>시제 차이</span><div style={{display:"flex",alignItems:"center",gap:4}}><input type="text" inputMode="numeric" value={report.cashDiff} onChange={e=>u("cashDiff",e.target.value.replace(/[^0-9]/g,""))} placeholder="0" style={S.num}/><span style={{fontSize:12,color:"#8B7355"}}>원</span></div></div>
      </div>

      <div style={S.sec}><div style={S.head}>★ 특이사항</div>
        <textarea value={report.memo} onChange={e=>u("memo",e.target.value)} placeholder="오늘의 특이사항을 적어주세요" rows={3} style={S.txt}/>
      </div>

      <B primary onClick={doSave} disabled={loading} style={{width:"100%",padding:"14px 0",fontSize:16}}>
        {saved ? "✓ 저장 완료!" : "💾 저장하기"}
      </B>
    </div>
  );
}

function WageGate({ emps, shifts }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  const tryUnlock = () => {
    if (pw === WAGE_PASS) { setUnlocked(true); }
    else { setErr(true); setPw(""); setTimeout(() => setErr(false), 1500); }
  };

  if (!unlocked) return (
    <div style={{ background: "#FFFDF9", borderRadius: 14, border: "1px solid #EBE2D5", padding: "40px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 24, marginBottom: 12 }}>🔐</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#2D2016", marginBottom: 6 }}>급여 정보 보호</div>
      <p style={{ fontSize: 12, color: "#B5A48B", marginBottom: 16 }}>비밀번호를 입력해주세요</p>
      <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && tryUnlock()}
        placeholder="비밀번호" autoFocus
        style={{ width: 200, padding: "10px 14px", border: err ? "2px solid #D95550" : "1.5px solid #E0D5C5", borderRadius: 8, fontSize: 16, fontFamily: "inherit", textAlign: "center", letterSpacing: 6, outline: "none", marginBottom: 12 }} />
      {err && <p style={{ color: "#D95550", fontSize: 12, fontWeight: 600, margin: "0 0 8px" }}>비밀번호가 틀렸습니다</p>}
      <div><B primary onClick={tryUnlock}>확인</B></div>
    </div>
  );

  return <WageTab emps={emps} shifts={shifts} />;
}

/* ═══════ 근로계약서 ═══════ */
const CONTRACT_EMPTY = { empName: "", empAddr: "", empPhone: "", startDate: "", endDate: "", workStart: "", workEnd: "", breakStart: "", breakEnd: "", workDays: [], workDaysCount: "", wage: "10320", insEmp: true, insInd: true, insPen: true, insHth: true, extraTask: "", contractDate: "" };

function ContractTab() {
  const [view, setView] = useState("form"); // "form" | "list"
  const [contract, setContract] = useState(CONTRACT_EMPTY);
  const [contracts, setContracts] = useState([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const u = (field, val) => { setContract(prev => ({ ...prev, [field]: val })); setSaved(false); };
  const uBool = (field) => { setContract(prev => ({ ...prev, [field]: !prev[field] })); setSaved(false); };
  const toggleDay = (d) => { 
    const arr = [...contract.workDays]; 
    const idx = arr.indexOf(d); 
    if (idx >= 0) arr.splice(idx, 1); else arr.push(d); 
    u("workDays", arr.sort((a,b) => DN.indexOf(a) - DN.indexOf(b))); 
  };

  const loadContracts = async () => {
    try {
      const local = localStorage.getItem("sm:contracts");
      let list = local ? JSON.parse(local) : [];
      if (isCloud) {
        try {
          const res = await api("GET", "shifts", { query: `store_id=eq.contract&emp_id=eq.saved` });
          if (res && res.length > 0) {
            list = res.map(r => {
              try { return { id: r.date, data: JSON.parse(r.start_time), savedAt: r.end_time }; } 
              catch { return null; }
            }).filter(Boolean);
          }
        } catch {}
      }
      setContracts(list);
    } catch {}
  };

  const doSave = async () => {
    if (!contract.empName.trim()) { alert("이름을 입력하세요"); return; }
    setLoading(true);
    try {
      const id = Date.now().toString();
      const savedAt = new Date().toISOString();
      const item = { id, data: contract, savedAt };
      const local = localStorage.getItem("sm:contracts");
      let list = local ? JSON.parse(local) : [];
      list = [item, ...list.filter(x => x.data.empName !== contract.empName)];
      localStorage.setItem("sm:contracts", JSON.stringify(list));
      
      if (isCloud) {
        try {
          await api("DELETE", "shifts", { query: `store_id=eq.contract&emp_id=eq.saved&date=eq.${id}` });
          await api("POST", "shifts", { body: { store_id: "contract", emp_id: "saved", date: id, start_time: JSON.stringify(contract), end_time: savedAt, break_min: 0 } });
        } catch {}
      }
      setSaved(true); 
      setTimeout(() => { setSaved(false); loadContracts(); }, 1500);
    } catch {}
    setLoading(false);
  };

  const doReset = () => { setContract({ ...CONTRACT_EMPTY }); setSaved(false); };

  const loadContract = (item) => {
    setContract(item.data);
    setView("form");
  };

  const deleteContract = async (item) => {
    if (!confirm(`${item.data.empName} 계약서를 삭제하시겠습니까?`)) return;
    try {
      const local = localStorage.getItem("sm:contracts");
      let list = local ? JSON.parse(local) : [];
      list = list.filter(x => x.id !== item.id);
      localStorage.setItem("sm:contracts", JSON.stringify(list));
      if (isCloud) {
        try { await api("DELETE", "shifts", { query: `store_id=eq.contract&emp_id=eq.saved&date=eq.${item.id}` }); } catch {}
      }
      loadContracts();
    } catch {}
  };

  const printPDF = () => {
    if (!contract.empName.trim()) { alert("이름을 입력하세요"); return; }
    const w = window.open("", "_blank");
    if (!w) { alert("팝업이 차단되었습니다"); return; }
    w.document.write(generateContractHTML(contract));
    w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  useEffect(() => { loadContracts(); }, []);

  const S = {
    sec: { background: "#FFFDF9", borderRadius: 12, border: "1px solid #EBE2D5", padding: 14, marginBottom: 10 },
    head: { fontSize: 12, fontWeight: 700, color: "#C4956A", marginBottom: 10, paddingBottom: 5, borderBottom: "1px solid #F0EBE3" },
    label: { fontSize: 12, color: "#5C4A35", fontWeight: 600, marginBottom: 5 },
    input: { padding: "9px 11px", border: "1.5px solid #E0D5C5", borderRadius: 6, fontSize: 13, fontFamily: "inherit", outline: "none", background: "#FFFDF9", color: "#2D2016", width: "100%", boxSizing: "border-box", maxWidth: "100%" },
  };

  if (view === "list") {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#2D2016" }}>저장된 계약서</div>
          <B onClick={() => setView("form")} style={{ padding: "8px 14px", fontSize: 13 }}>✏️ 새로 작성</B>
        </div>
        {contracts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#B5A48B", fontSize: 13 }}>저장된 계약서가 없습니다</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {contracts.map(item => (
              <div key={item.id} style={{ background: "#FFFDF9", border: "1px solid #EBE2D5", borderRadius: 10, padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#2D2016", marginBottom: 3 }}>{item.data.empName}</div>
                  <div style={{ fontSize: 11, color: "#B5A48B" }}>
                    {item.data.startDate} ~ {item.data.endDate} · 시급 {Number(item.data.wage).toLocaleString()}원
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => loadContract(item)} style={{ padding: "6px 10px", border: "none", background: "#C4956A", color: "#FFF", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>보기</button>
                  <button onClick={() => deleteContract(item)} style={{ padding: "6px 10px", border: "1px solid #E0D5C5", background: "transparent", color: "#8B7355", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#2D2016" }}>근로계약서 작성</div>
          <div style={{ fontSize: 10, color: "#B5A48B" }}>입력 후 저장 → PDF 출력</div>
        </div>
        <B ghost onClick={() => setView("list")} style={{ padding: "8px 14px", fontSize: 12 }}>📋 목록</B>
      </div>

      <div style={S.sec}>
        <div style={S.head}>👤 근로자 정보</div>
        <div style={{ display: "grid", gap: 9 }}>
          <div><div style={S.label}>이름</div><input value={contract.empName} onChange={e => u("empName", e.target.value)} placeholder="홍길동" style={S.input} /></div>
          <div><div style={S.label}>주소</div><input value={contract.empAddr} onChange={e => u("empAddr", e.target.value)} placeholder="서울시 중구..." style={S.input} /></div>
          <div><div style={S.label}>연락처</div><input value={contract.empPhone} onChange={e => u("empPhone", e.target.value)} placeholder="010-0000-0000" style={S.input} /></div>
        </div>
      </div>

      <div style={S.sec}>
        <div style={S.head}>📋 계약기간</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div><div style={S.label}>시작일</div><input type="date" value={contract.startDate} onChange={e => u("startDate", e.target.value)} style={S.input} /></div>
          <div><div style={S.label}>종료일</div><input type="date" value={contract.endDate} onChange={e => u("endDate", e.target.value)} style={S.input} /></div>
        </div>
      </div>

      <div style={S.sec}>
        <div style={S.head}>⏰ 근로시간</div>
        <div style={{ display: "grid", gap: 9 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><div style={S.label}>근무 시작</div><input type="time" value={contract.workStart} onChange={e => u("workStart", e.target.value)} style={S.input} /></div>
            <div><div style={S.label}>근무 종료</div><input type="time" value={contract.workEnd} onChange={e => u("workEnd", e.target.value)} style={S.input} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><div style={S.label}>휴게 시작</div><input type="time" value={contract.breakStart} onChange={e => u("breakStart", e.target.value)} style={S.input} /></div>
            <div><div style={S.label}>휴게 종료</div><input type="time" value={contract.breakEnd} onChange={e => u("breakEnd", e.target.value)} style={S.input} /></div>
          </div>
        </div>
      </div>

      <div style={S.sec}>
        <div style={S.head}>📅 근무요일</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 9 }}>
          {["월","화","수","목","금","토","일"].map(d => {
            const active = contract.workDays.includes(d);
            return (
              <button key={d} onClick={() => toggleDay(d)} style={{ flex: 1, padding: "10px 0", border: active ? "2px solid #C4956A" : "1.5px solid #E0D5C5", background: active ? "#C4956A" : "transparent", color: active ? "#FFF" : "#8B7355", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{d}</button>
            );
          })}
        </div>
        <div><div style={S.label}>주 근무일수</div><input type="text" inputMode="numeric" value={contract.workDaysCount} onChange={e => u("workDaysCount", e.target.value.replace(/[^0-9]/g, ""))} placeholder="5" style={S.input} /></div>
      </div>

      <div style={S.sec}>
        <div style={S.head}>💰 임금</div>
        <div><div style={S.label}>시급 (원)</div><input type="text" inputMode="numeric" value={contract.wage} onChange={e => u("wage", e.target.value.replace(/[^0-9]/g, ""))} placeholder="10320" style={{ ...S.input, textAlign: "right" }} /></div>
        <div style={{ fontSize: 10, color: "#B5A48B", marginTop: 5 }}>※ 2026년 최저임금 10,320원 · 지급일 익월 10일</div>
      </div>

      <div style={S.sec}>
        <div style={S.head}>📝 업무내용</div>
        <div style={{ fontSize: 11, color: "#8B7355", marginBottom: 6 }}>홀서빙, 청소, 기타:</div>
        <input value={contract.extraTask} onChange={e => u("extraTask", e.target.value)} placeholder="추가 업무 입력" style={S.input} />
      </div>

      <div style={S.sec}>
        <div style={S.head}>🛡 사회보험</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[["고용보험", "insEmp"], ["산재보험", "insInd"], ["국민연금", "insPen"], ["건강보험", "insHth"]].map(([label, key]) => (
            <label key={key} onClick={() => uBool(key)} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, color: "#2D2016" }}>
              <span style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${contract[key] ? "#C4956A" : "#D5C9B8"}`, background: contract[key] ? "#C4956A" : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#FFF", fontWeight: 700, flexShrink: 0 }}>{contract[key] ? "✓" : ""}</span>
              {label}
            </label>
          ))}
        </div>
      </div>

      <div style={S.sec}>
        <div style={S.head}>📅 계약일</div>
        <input type="date" value={contract.contractDate} onChange={e => u("contractDate", e.target.value)} style={S.input} />
      </div>

      <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
        <B primary onClick={doSave} disabled={loading} style={{ flex: 1, padding: "13px 0", fontSize: 14 }}>
          {saved ? "✓ 저장 완료" : loading ? "저장 중..." : "💾 저장"}
        </B>
        <B onClick={printPDF} style={{ padding: "13px 18px", fontSize: 14 }}>🖨 PDF</B>
        <B ghost onClick={doReset} style={{ padding: "13px 14px", fontSize: 14 }}>🔄</B>
      </div>

      <div style={{ padding: "9px 12px", background: "#F7F2EA", borderRadius: 8, fontSize: 10, color: "#A89878", lineHeight: 1.5 }}>
        <strong>고정값</strong> 사업체: 팔팔너구리해장 / 주소: 서울 중구 퇴계로 421 1층 2호 / 대표: 양두환, 박지현 / 근무지: 신당본점
      </div>
    </div>
  );
}

function generateContractHTML(c) {
  const workDaysText = c.workDays.length > 0 ? c.workDays.join(", ") : "미정";
  const insText = [c.insEmp && "고용보험", c.insInd && "산재보험", c.insPen && "국민연금", c.insHth && "건강보험"].filter(Boolean).join(", ");
  
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>근로계약서_${c.empName}</title>
<style>
@page { size: A4; margin: 15mm 18mm; }
@media print { button { display: none !important; } }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Malgun Gothic', sans-serif; font-size: 9pt; line-height: 1.4; color: #000; padding: 15px; }
h1 { text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 18px; border-bottom: 2.5px solid #000; padding-bottom: 8px; }
.intro { text-align: center; margin-bottom: 18px; font-size: 9pt; }
.section { margin-bottom: 12px; }
.section-title { font-size: 10pt; font-weight: bold; margin-bottom: 6px; padding: 4px 8px; background: #f0f0f0; border-left: 3px solid #333; }
table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
th, td { border: 1px solid #000; padding: 5px 7px; text-align: left; font-size: 9pt; }
th { background: #e8e8e8; font-weight: bold; width: 28%; }
.clause { margin-bottom: 10px; padding-left: 12px; font-size: 8.5pt; line-height: 1.4; }
.note { font-size: 7.5pt; line-height: 1.35; padding: 6px 8px; background: #f9f9f9; border: 1px solid #ddd; margin-top: 4px; color: #333; }
.signature { display: flex; justify-content: space-between; margin-top: 15px; page-break-inside: avoid; }
.signature-box { width: 48%; border: 1.5px solid #000; padding: 10px; }
.signature-box h3 { font-size: 10pt; font-weight: bold; margin-bottom: 7px; border-bottom: 1px solid #000; padding-bottom: 4px; }
.signature-line { margin: 5px 0; font-size: 8.5pt; }
.print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #333; color: #fff; border: none; border-radius: 5px; font-size: 13px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 999; }
.print-btn:hover { background: #555; }
</style>
</head><body>
<button class="print-btn" onclick="window.print()">🖨 인쇄하기</button>
<h1>근 로 계 약 서</h1>

<p class="intro">
<strong>팔팔너구리해장</strong> (이하 "갑"이라 함)과(와) <strong>${c.empName}</strong> (이하 "을"이라 함)은(는) 다음과 같이 근로계약을 체결한다.
</p>

<div class="section">
<div class="section-title">제1조 (근로계약기간)</div>
<table>
<tr><th>계약기간</th><td>${c.startDate || "____년 __월 __일"} ~ ${c.endDate || "____년 __월 __일"}</td></tr>
</table>
</div>

<div class="section">
<div class="section-title">제2조 (근무장소 및 업무내용)</div>
<table>
<tr><th>근무장소</th><td>팔팔너구리해장 신당본점</td></tr>
<tr><th>업무내용</th><td>홀서빙, 청소${c.extraTask ? ", " + c.extraTask : ""}</td></tr>
</table>
</div>

<div class="section">
<div class="section-title">제3조 (소정근로시간 및 근무일)</div>
<table>
<tr><th>근로시간</th><td>${c.workStart || "__:__"} ~ ${c.workEnd || "__:__"}</td></tr>
<tr><th>휴게시간</th><td>${c.breakStart || "__:__"} ~ ${c.breakEnd || "__:__"}</td></tr>
<tr><th>근무요일</th><td>${workDaysText}</td></tr>
<tr><th>주 근무일수</th><td>${c.workDaysCount || "_"}일</td></tr>
<tr><th>주휴일</th><td>없음</td></tr>
</table>
<div class="note">
<strong>※ 근무스케줄 변동에 관한 사항</strong><br>
사업장 운영 상황에 따라 근무일 및 근로시간이 변동될 수 있으며, 이 경우 사업주는 근로자에게 최소 1일 전까지 변경된 근무 스케줄을 서면(문자, 메신저 등 포함)으로 협의하여야 한다. 다만, 근로자의 동의 없이 소정근로시간의 총량을 일방적으로 변경할 수 없다.
</div>
</div>

<div class="section">
<div class="section-title">제4조 (임금)</div>
<table>
<tr><th>시간급</th><td>${Number(c.wage || 0).toLocaleString()}원</td></tr>
<tr><th>임금지급일</th><td>익월 10일</td></tr>
<tr><th>지급방법</th><td>을의 예금통장에 입금</td></tr>
</table>
</div>

<div class="section">
<div class="section-title">제5조 (사회보험 적용)</div>
<table>
<tr><th>적용 보험</th><td>${insText || "해당없음"}</td></tr>
</table>
</div>

<div class="section">
<div class="section-title">제6조 (근로계약서 교부)</div>
<div class="clause">갑은 을에게 본 근로계약서를 서면으로 작성하여 교부한다.</div>
</div>

<div class="section">
<div class="section-title">제7조 (성실이행의무)</div>
<div class="clause">갑과 을은 각자가 본 계약에서 정한 바를 성실히 이행하여야 한다.</div>
</div>

<div class="section">
<div class="section-title">제8조 (기타)</div>
<div class="clause">이 계약에 정함이 없는 사항은 근로기준법령에 의한다.</div>
</div>

<p style="text-align:center; font-size:9pt; margin:12px 0;">
<strong>${c.contractDate || "____년 __월 __일"}</strong>
</p>

<div class="signature">
<div class="signature-box">
<h3>사업주 (갑)</h3>
<div class="signature-line"><strong>상 호:</strong> 팔팔너구리해장</div>
<div class="signature-line"><strong>주 소:</strong> 서울특별시 중구 퇴계로 421 1층 2호</div>
<div class="signature-line"><strong>대표자:</strong> 양두환, 박지현</div>
<div class="signature-line" style="margin-top:18px; border-top:1px solid #999; padding-top:8px;"><strong>서명:</strong> ________________</div>
</div>

<div class="signature-box">
<h3>근로자 (을)</h3>
<div class="signature-line"><strong>주 소:</strong> ${c.empAddr || "_______________________"}</div>
<div class="signature-line"><strong>연락처:</strong> ${c.empPhone || "_______________"}</div>
<div class="signature-line"><strong>성 명:</strong> ${c.empName || "_______________"}</div>
<div class="signature-line" style="margin-top:18px; border-top:1px solid #999; padding-top:8px;"><strong>서명:</strong> ________________</div>
</div>
</div>

</body></html>`;
}

const TABS = [{ id: "checklist", label: "체크리스트", icon: "✅" }, { id: "report", label: "매장관리", icon: "📋" }, { id: "schedule", label: "스케줄", icon: "📅" }, { id: "wage", label: "급여계산", icon: "💰" }, { id: "contract", label: "계약서", icon: "📄" }];

function LockScreen({ onUnlock }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const tryUnlock = () => {
    if (pw === PASS) { onUnlock(); }
    else { setErr(true); setPw(""); setTimeout(() => setErr(false), 1500); }
  };
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "'Noto Sans KR', sans-serif", background: "#F5EFE6" }}>
      <div style={{ background: "#FFFDF9", borderRadius: 20, border: "1px solid #EBE2D5", padding: "40px 32px", textAlign: "center", width: 300, maxWidth: "90vw" }}>
        <img src="/logo.png" alt="logo" style={{ width: 72, height: 72, borderRadius: 16, objectFit: "cover", margin: "0 auto 16px", display: "block" }} />
        <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#2D2016" }}>팔팔너구리해장 신당본점</h2>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "#B5A48B" }}>관리 시스템</p>
        <p style={{ margin: "-18px 0 24px", fontSize: 12, color: "#C4B99A" }}>비밀번호를 입력해주세요</p>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && tryUnlock()}
          placeholder="비밀번호"
          autoFocus
          style={{ width: "100%", padding: "12px 16px", border: err ? "2px solid #D95550" : "1.5px solid #E0D5C5", borderRadius: 10, fontSize: 18, fontFamily: "inherit", textAlign: "center", letterSpacing: 8, outline: "none", background: "#FFFDF9", color: "#2D2016", boxSizing: "border-box" }}
        />
        {err && <p style={{ color: "#D95550", fontSize: 13, margin: "8px 0 0", fontWeight: 600 }}>비밀번호가 틀렸습니다</p>}
        <button onClick={tryUnlock} style={{ marginTop: 16, width: "100%", padding: "12px 0", background: "#2D2016", color: "#FFF", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          입장하기
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState("checklist");
  const [emps, setEmps] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [sel, setSel] = useState(null);
  const [cloud, setCloud] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    (async () => {
      // Try cloud
      let cloudOk = false;
      try {
        const r = await fetch(`${SUPA_URL}/rest/v1/employees?store_id=eq.${SID}&limit=1`, {
          headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` }
        });
        cloudOk = r.ok;
      } catch {}

      isCloud = cloudOk;
      setCloud(cloudOk);

      let e = [], s = [];
      if (cloudOk) {
        try {
          e = await api("GET", "employees", { query: `store_id=eq.${SID}&order=created_at.asc` });
          s = await api("GET", "shifts", { query: `store_id=eq.${SID}` });
        } catch { e = []; s = []; }
      } else {
        e = await localGet("sm:emp", []);
        s = await localGet("sm:sh", []);
      }

      // 색상 재할당 (기존 직원도 구분되는 색으로)
      if (e && e.length > 0) {
        e = e.map((emp, i) => ({ ...emp, color: COLORS[i % COLORS.length] }));
      }

      setEmps(e || []);
      setShifts(s || []);
      if (e && e.length > 0) setSel(e[0].id);
      setReady(true);
    })();
  }, []);

  if (!unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />;

  if (!ready) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "'Noto Sans KR', sans-serif", background: "#F5EFE6" }}>
      <span style={{ color: "#C4956A", fontSize: 15 }}>연결 중...</span>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif", background: "#F5EFE6", minHeight: "100vh", color: "#2D2016" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <img src="/logo.png" alt="logo" style={{ width: 38, height: 38, borderRadius: 10, objectFit: "cover" }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>팔팔너구리해장 신당본점</h1>
            <p style={{ margin: 0, fontSize: 11, color: "#B5A48B" }}>관리 시스템</p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: cloud ? "#5CB85C" : "#E8D47C" }} />
            <span style={{ fontSize: 10, color: "#B5A48B" }}>{cloud ? "클라우드" : "로컬"}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 3, padding: "4px 5px", background: "rgba(0,0,0,0.03)", borderRadius: 10, marginBottom: 16 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 8, background: tab === t.id ? "#2D2016" : "transparent", color: tab === t.id ? "#FFF8F0" : "#8B7355", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}>{t.icon} {t.label}</button>
          ))}
        </div>

        {tab !== "checklist" && tab !== "report" && tab !== "contract" && <EmpPanel emps={emps} setEmps={setEmps} sel={sel} setSel={setSel} />}
        {tab === "schedule" && <ScheduleTab emps={emps} shifts={shifts} setShifts={setShifts} sel={sel} />}
        {tab === "wage" && <WageGate emps={emps} shifts={shifts} />}
        {tab === "report" && <DailyReportTab emps={emps} />}
        {tab === "checklist" && <ChecklistTab />}
        {tab === "contract" && <ContractTab />}

        <div style={{ textAlign: "center", marginTop: 32, padding: "14px 0", borderTop: "1px solid #EDE4D8" }}>
          <p style={{ margin: 0, fontSize: 11, color: "#C4B99A" }}>데이터 자동 저장</p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#8B7355", fontWeight: 600 }}>개발자 : zee10</p>
          <p style={{ margin: "4px 0 0", fontSize: 9, color: "#C4B99A" }}>© 2026 zee10. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
