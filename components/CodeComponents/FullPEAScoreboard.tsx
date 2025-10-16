import React, { useEffect, useRef } from 'react';

export interface FullPEAScoreboardProps {
  className?: string;
  variant?: 'buda' | 'west-buda';
  height?: string | number;
  maxWidth?: string | number;
  dashboardWidth?: string | number;
}

export function FullPEAScoreboard({ 
  className = '',
  variant = 'buda',
  height = 600,
  maxWidth = 1280,
  dashboardWidth = 1280
}: FullPEAScoreboardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Configuration for each variant
  const config = {
    'buda': {
      domain: 'cfabuda.zermattservices.com',
      bundle: 'https://storage.googleapis.com/trainingapp-assets/snapshots/buda/all.json',
      logo: 'https://storage.googleapis.com/trainingapp-assets/CFA%20Buda%20Logo.png',
      title: 'Buda PEA Scoreboard'
    },
    'west-buda': {
      domain: 'cfawestbuda.zermattservices.com',
      bundle: 'https://storage.googleapis.com/trainingapp-assets/snapshots/west-buda/all.json',
      logo: 'https://storage.googleapis.com/trainingapp-assets/CFA%20West%20Buda%20Logo.png',
      title: 'West Buda PEA Scoreboard'
    }
  };

  const currentConfig = config[variant];

  // Generate the HTML content that will be injected into the iframe
  const generateHTML = () => {
    return `
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<title>${currentConfig.title}</title>

<!-- Favicons / theme -->
<link rel="icon" href="https://storage.googleapis.com/trainingapp-assets/Circle%20C%20CFA.png" sizes="any">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#111317" media="(prefers-color-scheme: dark)">

<style>
  @font-face{
    font-family:"ApercuMedium";
    src:url("https://storage.googleapis.com/apercu_font/FontsFree-Net-ApercuMedium.woff2") format("woff2");
    font-weight:500;font-style:normal;font-display:swap;
  }

  /* ===== Light mode (default) ===== */
  :root{
    --bg:#ffffff; --text:#101317; --muted:#6b7280; --border:#e5e7eb; --head:#f9fafb; --hover:#fafafa;
    --green:#249e6b; --yellow:#ffb549; --red:#ad2624;
    --pill-bg:#f3f4f6; --pill-on:#111827; --pill-off:#6b7280; --pill-border:#e5e7eb;
    --divider:#9ca3af;
    --row-h: 34px;
    --dashboard-width: 1280px;
  }
  /* ===== Dark override ===== */
  @media (prefers-color-scheme: dark){
    :root{
      --bg:#111317; --text:#e5e7eb; --muted:#9ca3af; --border:#2b3036; --head:#1a1f24; --hover:#0e1114;
      --pill-bg:#1b2026; --pill-on:#e5e7eb; --pill-off:#9ca3af; --pill-border:#2b3036;
      --divider:#3b424a;
    }
  }

  html, body {
    height: 100%; margin: 0; overflow: hidden;
    background: var(--bg); color: var(--text);
    font-family: "ApercuMedium",system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
    -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
    overscroll-behavior: none;
  }

  .wrap{
    max-width: var(--dashboard-width, 1280px); margin: 0 auto; padding: 24px 16px 40px;
    box-sizing: border-box; display:flex; flex-direction:column; height:100dvh; gap:12px;
  }

  /* Header grid: rubric (col 1), center controls (col 2), logo (col 3) */
  .header{ display:grid; grid-template-columns:1fr auto 1fr; align-items:start; gap:12px; }
  .header-center{ grid-column:2; text-align:center; }
  .header-logo{ grid-column:3; justify-self:end; display:flex; align-items:start; }
  .logo-img{ width:180px; height:auto; }

  h1{ margin:0; font-size:22px; line-height:1.2; }
  .meta{ color:var(--muted); font-size:12px; margin-top:6px; }
  .meta-note{ color:var(--muted); font-size:12px; margin-top:4px; }

  /* Segmented control */
  .segment{
    display:inline-flex; border:1px solid var(--pill-border); border-radius:999px;
    overflow:hidden; background:var(--pill-bg); box-shadow:0 1px 2px rgba(0,0,0,.05); margin-top:10px;
  }
  .segment input{ position:absolute; opacity:0; pointer-events:none; }
  .segment label{ padding:8px 14px; cursor:pointer; user-select:none; font-size:14px; color:var(--pill-off); }
  .segment input:checked+label{ background:var(--head); color:var(--pill-on) !important; }

  .positions-hint{ grid-column:2; margin-top:8px; font-size:13.5px; font-weight:600; color:var(--muted); }
  .positions, .leaders{ grid-column:2; display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-top:6px; }

  /* Pills */
  .pos-pill, .leader-pill{
    appearance:none; border:1px solid var(--pill-border); background:transparent;
    color:var(--pill-on); padding:6px 10px; border-radius:999px; cursor:pointer; font:inherit;
  }
  .pos-pill[aria-pressed="true"], .leader-pill[aria-pressed="true"]{
    background:var(--pill-bg); border-color:var(--pill-border); color:var(--pill-on) !important;
  }

  .rubric{ grid-column:1; justify-self:start; }
  .rubric-table{
    border:1px solid var(--border); border-radius:10px; overflow:hidden; font-size:13px; font-weight:500; line-height:1.3;
    table-layout:fixed; width:180px; text-align:center; border-collapse:separate; border-spacing:0; background:var(--head);
  }
  .rubric-table th,.rubric-table td{ padding:8px 10px; border:0; white-space:nowrap; }
  .rubric-title{ background:var(--head); color:var(--text); font-weight:700; font-size:15px; }
  .rubric-red{ background: var(--red); color:#fff; }
  .rubric-yellow{ background: var(--yellow); color:#111; }
  .rubric-green{ background: var(--green); color:#fff; }

  .scroll{
    position:relative; flex:1; min-height:0; overflow:auto; border:1px solid var(--border);
    border-radius:10px; background:var(--head); -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  .spinner-wrap{ position:absolute; inset:0; display:none; align-items:center; justify-content:center; z-index:4; }
  .spinner{ width:38px; height:38px; border:3px solid var(--border); border-top-color:var(--pill-on); border-radius:50%; animation:spin .9s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }

  #grid{ border-collapse:collapse; table-layout:fixed; width:100%; font-size:14px; }

  #grid thead #head th{
    padding:0 2px; height:var(--row-h); line-height:var(--row-h);
    position:sticky; top:0; z-index:3; background:var(--head);
    font-weight:600; border-bottom:none; white-space:nowrap;
  }
  #grid thead tr.second-head th{
    padding:0 2px; height:var(--row-h); line-height:var(--row-h);
    position:sticky; top:var(--row-h); z-index:3; border-top:none !important;
    border-bottom:1px solid var(--border); background:var(--head); white-space:nowrap;
  }
  #grid thead tr.second-head th.num{ color:#fff; }
  #grid thead tr.second-head th.v-green{ background:var(--green)!important; }
  #grid thead tr.second-head th.v-yellow{ background:var(--yellow)!important; }
  #grid thead tr.second-head th.v-red{ background:var(--red)!important; }

  #grid tbody td{ padding:0 2px; height:var(--row-h); line-height:var(--row-h); white-space:nowrap; vertical-align:middle; }
  #grid th,#grid td{ border-bottom:1px solid var(--border); }
  #grid tbody tr:hover td:not(.v-green):not(.v-yellow):not(.v-red){ background:var(--hover); }

  tr.group-head{ background:transparent; cursor:pointer; }
  tr.group-child{ display:none; background:transparent; }
  tr.group-child td{ font-size:12px; padding-top:8px; padding-bottom:8px; line-height:unset; height:auto; }

  .toggle{ cursor:pointer; user-select:none; display:inline-flex; align-items:center; gap:6px; font-weight:600; color:var(--pill-on); }
  .chev{ display:inline-block; transition:transform .15s ease; font-size:12px; }
  tr[aria-expanded="true"] .chev{ transform:rotate(90deg); }

  td.num, th.num{ text-align:center; color:#fff; font-weight:600; }
  td.v-green, th.v-green{ background:var(--green) !important; color:#fff !important; }
  td.v-yellow, th.v-yellow{ background:var(--yellow) !important; color:#111 !important; }
  td.v-red, th.v-red{ background:var(--red) !important; color:#fff !important; }

  #grid thead th:nth-child(3), #grid tbody td:nth-child(3){ text-align:center; }
  #grid thead th:nth-child(2), #grid tbody td:nth-child(2){
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }
  
  /* Fix data alignment - center all data columns except name */
  #grid tbody td:nth-child(n+3), #grid thead th:nth-child(n+3) {
    text-align: center;
  }
  
  /* Ensure numerical values are centered and styled */
  #grid tbody td.num, #grid thead th.num {
    text-align: center !important;
    font-weight: 600;
  }
  #grid.has-divider thead th:nth-last-child(2),
  #grid.has-divider tbody td:nth-last-child(2){ box-shadow: inset 2px 0 0 var(--divider); }

  /* ============== Collapsible controls (mobile) ============== */
  .panel-toggle{
    display:none; margin:12px auto 6px; padding:6px 12px; border-radius:999px;
    border:1px solid var(--pill-border); background:var(--pill-bg); color:var(--pill-on);
    font:inherit; cursor:pointer; user-select:none; align-items:center; gap:8px;
  }
  .panel-toggle .caret{ display:inline-block; transition: transform .15s ease; }
  .panel-toggle[aria-expanded="false"] .caret{ transform: rotate(-90deg); }

  .panel-body{ display:block; }
  .panel-body[hidden]{ display:none !important; }

  /* Mobile tweaks */
  @media (max-width: 768px){
    .header{ grid-template-columns:1fr; gap:8px; }
    .header-center{ grid-column:1; }
    .rubric{ grid-column:1; margin-bottom:6px; }
    .header-logo{ display:none !important; }
    .panel-toggle{ display:inline-flex; }
    .rubric-table{ width:100%; }
    html, body { overflow: hidden; }
  }
  @media (max-width: 420px){
    html, body { overflow:auto; }
  }
</style>
</head>

<body>
  <div class="wrap">
    <div class="header">
      <!-- Left: Rating Scale -->
      <div class="rubric" aria-label="Rating scale">
        <table class="rubric-table">
          <thead><tr><th class="rubric-title">Rating Scale</th></tr></thead>
          <tbody>
            <tr><td class="rubric-red">Not Yet = 1.0 – 1.49</td></tr>
            <tr><td class="rubric-yellow">On the Rise = 1.50 – 2.74</td></tr>
            <tr><td class="rubric-green">Crushing It = 2.75 – 3.0</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Center: Title + Collapsible Controls -->
      <div class="header-center">
        <h1 id="title">Team Member Ratings – FOH</h1>

        <!-- Mobile-only control to collapse/expand the block below -->
        <button id="panelToggle" class="panel-toggle" aria-expanded="true" aria-controls="panelBody">
          <span class="caret">▾</span> Options
        </button>

        <div id="panelBody" class="panel-body">
          <div class="segment" role="tablist" aria-label="Area switch">
            <input type="radio" name="area" id="segFOH" value="FOH" checked>
            <label for="segFOH" role="tab" aria-selected="true">FOH</label>
            <input type="radio" name="area" id="segBOH" value="BOH">
            <label for="segBOH" role="tab" aria-selected="false">BOH</label>
          </div>

          <div id="posHint" class="positions-hint" hidden>Click a position to see the Big 5 Breakdown:</div>
          <div class="positions" id="positionsBar" hidden></div>

          <!-- Leader row -->
          <div class="leaders" id="leadersBar" hidden></div>

          <!-- Meta lines -->
          <div class="meta" id="meta"></div>
          <div id="metaNote" class="meta-note"></div>
          <div id="memberHint" class="positions-hint">Click a team member's name to see individual submissions</div>
        </div>
      </div>

      <!-- Right: Logo (hidden on mobile via CSS) -->
      <div class="header-logo">
        <img src="${currentConfig.logo}" alt="Location Logo" class="logo-img">
      </div>
    </div>

    <div class="scroll" id="scroller">
      <div id="spinnerWrap" class="spinner-wrap" aria-hidden="true"><div class="spinner"></div></div>
      <table id="grid" aria-label="Sheet data">
        <colgroup id="colgroup"></colgroup>
        <thead><tr id="head"></tr></thead>
        <tbody id="body"></tbody>
      </table>
    </div>
  </div>

  <script>
    // Use the bundle URL from the current variant
    const BUNDLE_URL = "${currentConfig.bundle}" + "?v=" + Date.now();

    // --- Mobile controls collapsible ---
    (function(){
      const btn = document.getElementById('panelToggle');
      const body = document.getElementById('panelBody');
      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', (!expanded).toString());
        body.hidden = expanded;
      });
    })();

    // ======== CONFIG ========
    const initialTab = new URLSearchParams(location.search).get('tab') || 'FOH';

    // ======== STATE ========
    const dataCache = Object.create(null);
    let bundle = null;
    let currentTab = initialTab;

    const $ = (sel) => document.querySelector(sel);

    const GROUPS = {
      FOH: ['iPOS','Host','OMD','Runner','Bagging','Drinks 1/3','Drinks 2','3H Values','Trainer','Team Lead'],
      BOH: ['Breading','Secondary','Fries','Primary','Machines','Prep','3H Values','Trainer','Team Lead']
    };
    const POS_TAB = {
      FOH: { '3H Values': '3H FOH', 'Trainer': 'FOH Trainer', 'Team Lead': 'FOH Team Lead' },
      BOH: { '3H Values': '3H BOH', 'Trainer': 'BOH Trainer', 'Team Lead': 'BOH Team Lead' }
    };
    const LEADERS = { FOH: 'FOH Leadership', BOH: 'BOH Leadership' };
    const LEADER_SET = new Set([LEADERS.FOH, LEADERS.BOH]);
    const POSITION_TAB_SET = new Set([
      ...GROUPS.FOH.map(l => POS_TAB.FOH[l] || l),
      ...GROUPS.BOH.map(l => POS_TAB.BOH[l] || l)
    ]);

    let ratingsCountIdx = -1;
    function isPureNumber(s){ 
      if (s === null || s === undefined || s === '') return false;
      const str = String(s).trim();
      if (str === '') return false;
      
      // Exclude dates and other non-rating values
      if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) return false; // MM/DD/YYYY format
      if (/\d{4}-\d{2}-\d{2}/.test(str)) return false; // YYYY-MM-DD format
      if (/^\d{1,2}\/\d{1,2}$/.test(str)) return false; // MM/DD format
      
      // Simple check: if parseFloat works and the result is a finite number, it's a number
      const num = parseFloat(str);
      const result = !isNaN(num) && isFinite(num) && num >= 0 && num <= 3.0; // Ratings are 0-3.0
      return result;
    }
    function mk(tag){ return document.createElement(tag); }

    function showLoading(on){
      const wrap = $('#spinnerWrap'); const table = $('#grid');
      if (on){ wrap.style.display='flex'; table.style.visibility='hidden'; }
      else   { wrap.style.display='none'; table.style.visibility='visible'; }
    }

    // ======== LOAD BUNDLE ========
    async function loadBundle(){
      try{
        const res = await fetch(BUNDLE_URL, { cache: 'no-store' });
        if(!res.ok) throw new Error('HTTP '+res.status);
        const json = await res.json();
        if (!json || !json.tabs) throw new Error('Invalid bundle schema');
        bundle = json;
        for (const [tab, payload] of Object.entries(bundle.tabs)){
          dataCache[tab] = payload;
        }
      } catch(_){
        bundle = null;
      }
    }

    // ======== TABLE RENDERING ========
    function ensureColgroup(count){
      const cg = $('#colgroup');
      while (cg.children.length < count) cg.appendChild(mk('col'));
      while (cg.children.length > count) cg.lastElementChild.remove();
      return cg.children;
    }
    function measureHeaderTextWidth(th){
      const cs = getComputedStyle(th);
      const ghost = document.createElement('span');
      ghost.style.position = 'absolute'; ghost.style.visibility = 'hidden';
      ghost.style.whiteSpace = 'nowrap';
      ghost.style.fontFamily = cs.fontFamily; ghost.style.fontSize = cs.fontSize;
      ghost.style.fontWeight = cs.fontWeight; ghost.style.letterSpacing = cs.letterSpacing;
      ghost.textContent = th.textContent || '';
      document.body.appendChild(ghost);
      const w = Math.ceil(ghost.getBoundingClientRect().width);
      ghost.remove();
      return w;
    }
    function sizeColumns(cols){
      const cg = ensureColgroup(cols);
      const ths = document.querySelectorAll('#head th');
      if (ths.length < cols) return;

      const containerW = $('#scroller').clientWidth;
      const widths = new Array(cols).fill(0);
      widths[0] = 50;

      for (let i = 2; i < cols; i++) {
        const textW = measureHeaderTextWidth(ths[i]);
        widths[i] = textW + 24;
      }
      const fixedSum = widths.reduce((a,w,idx) => idx === 1 ? a : a + w, 0);
      widths[1] = Math.max(150, containerW - fixedSum);
      widths.forEach((w,i) => { cg[i].style.width = w + 'px'; });
    }
    function scheduleResize(cols){ requestAnimationFrame(() => sizeColumns(cols)); }

    const strip = v => String(v ?? '').replace(/[\s\u00A0\u2007\u202F]+/g,'').trim();
    function lastNonEmptyIndex(arr){
      for (let i = arr.length - 1; i >= 0; i--) if (strip(arr[i]) !== '') return i;
      return -1;
    }

    function tdValue(val, colIndex, cols, isLeaderTab, header){
      const d = mk('td');
      const display = (val == null ? '' : String(val));
      d.textContent = display;

      // Get the column name from header
      const columnName = header && header[colIndex] ? header[colIndex] : '';

      // Center all data columns except name (column 1)
      if (colIndex > 1) {
        d.style.textAlign = 'center';
      }

      // Skip color coding for specific column types based on name
      const isLastRating = columnName && /last\s*rating/i.test(columnName);
      const isRatingsCount = columnName && /#\s*of\s*ratings/i.test(columnName);
      
      if (isLastRating || isRatingsCount){
        d.style.color = 'var(--text)'; 
        d.style.textAlign = 'center'; 
        return d;
      }
      
      if (colIndex === 1 && display) d.title = display;

      // Apply color coding to numerical values (excluding specific column types)
      if (!isLastRating && !isRatingsCount && isPureNumber(display)){
        const num = parseFloat(display);
        d.classList.add('num');
        if (num >= 2.75) {
          d.classList.add('v-green');
        } else if (num >= 1.75) {
          d.classList.add('v-yellow');
        } else if (num >= 1.0) {
          d.classList.add('v-red');
        }
      }
      
      return d;
    }
    function thFromValue(val, colIndex, cols, isLeaderTab){
      const th = mk('th');
      const display = (val == null ? '' : String(val));
      th.textContent = display;

      // Center all header columns except name (column 1)
      if (colIndex > 1) {
        th.style.textAlign = 'center';
      }

      if (colIndex === ratingsCountIdx){
        th.style.color = 'var(--text)'; 
        th.style.textAlign = 'center'; 
        return th;
      }

      // Apply color coding to numerical values (excluding ratings count column)
      if (colIndex !== ratingsCountIdx && isPureNumber(display)){
        const num = parseFloat(display);
        th.classList.add('num');
        console.log('Header: Applying color to:', display, 'num:', num, 'colIndex:', colIndex);
        if (num >= 2.75) {
          th.classList.add('v-green');
          console.log('Header: Added green class');
        } else if (num >= 1.75) {
          th.classList.add('v-yellow');
          console.log('Header: Added yellow class');
        } else if (num >= 1.0) {
          th.classList.add('v-red');
          console.log('Header: Added red class');
        }
      }
      
      return th;
    }

    function buildTable(payload){
      showLoading(false);

      let header = payload.header.slice();
      console.log('buildTable called with payload:', payload);
      let rows   = payload.rows.map(r => r.slice());
      const sheetName = payload.sheetName;
      const updated   = payload.updated;

      const isLeaderTab = LEADER_SET.has(sheetName);
      const isPosition  = POSITION_TAB_SET.has(sheetName);

      ratingsCountIdx = header.findIndex(h => typeof h === 'string' && /#\s*of\s*ratings/i.test(h));
      console.log('ratingsCountIdx set to:', ratingsCountIdx, 'header:', header);

      // Include all non-empty trailing columns
      let last = lastNonEmptyIndex(header);
      rows.forEach(r => { last = Math.max(last, lastNonEmptyIndex(r)); });
      let cols = (last >= 0 ? last + 1 : header.length);
      header = header.slice(0, cols);
      rows   = rows.map(r => r.slice(0, cols));

      // position pages: drop the extra trailing empty col
      if (isPosition && cols > 0){
        cols -= 1; header = header.slice(0, cols); rows = rows.map(r => r.slice(0, cols));
      }

      // Title + updated
      document.getElementById('title').textContent = 'Team Member Ratings – ' + sheetName;
      document.getElementById('meta').textContent  = sheetName + ' — Last updated ' + updated;

      // View-specific guidance
      const noteEl = document.getElementById('metaNote');
      if (sheetName === 'FOH' || sheetName === 'BOH'){
        noteEl.innerHTML = 'Averages are based on the last 4 ratings in the respective position';
      } else if (LEADER_SET.has(sheetName)){
        noteEl.innerHTML = 'Averages are based on the last 10 ratings by the leader in the respective position<br># of Ratings is on a rolling 90 day basis';
      } else {
        noteEl.innerHTML = 'Averages are based on the last 4 ratings in the respective position<br># of Ratings is on a rolling 90 day basis';
      }

      const grid = document.getElementById('grid');
      grid.classList.toggle('has-divider', isPosition || isLeaderTab);

      const thead = grid.tHead;
      const headTr = document.getElementById('head'); headTr.innerHTML = '';
      thead.querySelectorAll('tr.second-head').forEach(n => n.remove());

      // Header row 1
      header.forEach(function(h){
        const th = mk('th'); th.textContent = h || ''; headTr.appendChild(th);
      });

      // Second sticky for position pages
      if (isPosition && rows.length){
        const firstData = rows.shift();
        const secondSticky = mk('tr'); secondSticky.className = 'second-head';
        for (let c = 0; c < cols; c++) secondSticky.appendChild(thFromValue(firstData[c], c, cols, false));
        thead.appendChild(secondSticky);
      }

      // ------- GROUPING -------
      const tbody = document.getElementById('body'); tbody.innerHTML = '';
      let groupId = 0, currentId = null, childCount = 0;

      const isHeadRow = (r) => (strip(r[0]) === '' && strip(r[1]) !== '');
      const isChildRow = (r) => (strip(r[0]) !== '');

      rows.forEach(r => {
        if (isHeadRow(r)){
          groupId += 1; currentId = 'g' + groupId; childCount = 0;
          const tr = mk('tr');
          tr.className = 'group-head';
          tr.dataset.group = currentId;
          tr.setAttribute('aria-expanded','false');

          tr.appendChild(tdValue(r[0], 0, cols, isLeaderTab, header));
          const nameTd = mk('td'); const btn = mk('span');
          btn.className = 'toggle'; btn.setAttribute('role','button'); btn.setAttribute('tabindex','0');
          btn.innerHTML = '<span class="chev">▸</span>' + (r[1] || '');
          nameTd.appendChild(btn); tr.appendChild(nameTd);

          for (let c = 2; c < cols; c++) tr.appendChild(tdValue(r[c], c, cols, isLeaderTab, header));
          tbody.appendChild(tr);
        } else if (currentId && isChildRow(r)) {
          if (!isLeaderTab || childCount < 10){
            const tr = mk('tr'); tr.className = 'group-child'; tr.dataset.parent = currentId;
            for (let c = 0; c < cols; c++) tr.appendChild(tdValue(r[c], c, cols, isLeaderTab, header));
            tbody.appendChild(tr);
            if (isLeaderTab) childCount += 1;
          }
        }
      });

      scheduleResize(cols);
    }

    document.getElementById('grid').addEventListener('click', function(e){
      const headTr = e.target.closest('tr.group-head');
      if (!headTr) return;
      const expanded = headTr.getAttribute('aria-expanded') === 'true';
      headTr.setAttribute('aria-expanded', (!expanded).toString());
      document.querySelectorAll('tr.group-child[data-parent="' + headTr.dataset.group + '"]')
        .forEach(tr => tr.style.display = !expanded ? 'table-row' : 'none');
    });

    function labelToTab(group, label){
      const map = POS_TAB[group] || {};
      return map[label] || label;
    }
    function tabToLabel(group, tab){
      const map = POS_TAB[group] || {};
      for (const k in map) if (map[k] === tab) return k;
      return tab;
    }

    function fetchTab(tab){
      return new Promise((resolve) => {
        if (dataCache[tab]) return resolve(dataCache[tab]);
        if (bundle && bundle.tabs && bundle.tabs[tab]){
          dataCache[tab] = bundle.tabs[tab];
          return resolve(dataCache[tab]);
        }
        resolve(null);
      });
    }

    function renderPositions(group){
      const bar = document.getElementById('positionsBar'), hint = document.getElementById('posHint');
      const items = (GROUPS[group] || []);
      bar.innerHTML = '';
      if (!items.length){ bar.hidden = true; hint.hidden = true; return; }
      items.forEach(label => {
        const b = mk('button');
        b.className = 'pos-pill'; b.type = 'button'; b.textContent = label; b.setAttribute('aria-pressed','false');
        b.addEventListener('click', function(){ setActivePosition(label); showTab(labelToTab(group, label)); });
        bar.appendChild(b);
      });
      hint.hidden = false; bar.hidden = false; clearActivePosition();
    }
    function clearActivePosition(){ document.querySelectorAll('.pos-pill[aria-pressed="true"]').forEach(b => b.setAttribute('aria-pressed','false')); }
    function setActivePosition(label){
      clearActivePosition();
      const btn = Array.from(document.querySelectorAll('.pos-pill')).find(b => b.textContent === label);
      if (btn) btn.setAttribute('aria-pressed','true');
    }

    function renderLeaders(group){
      const bar = document.getElementById('leadersBar');
      bar.innerHTML = '';
      const tabName = (group === 'FOH') ? LEADERS.FOH : LEADERS.BOH;
      if (!tabName){ bar.hidden = true; return; }
      const b = mk('button');
      b.className = 'leader-pill'; b.type = 'button'; b.textContent = 'Leadership View'; b.setAttribute('aria-pressed','false');
      b.addEventListener('click', function(){
        clearActivePosition();
        setActiveLeader(true);
        showTab(tabName);
      });
      bar.appendChild(b);
      bar.hidden = false;
      setActiveLeader(false);
    }
    function setActiveLeader(on){
      const btn = document.querySelector('.leader-pill');
      if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    const segFOH = document.getElementById('segFOH');
    const segBOH = document.getElementById('segBOH');
    segFOH.addEventListener('change', function(){
      if (segFOH.checked){
        renderPositions('FOH'); renderLeaders('FOH');
        clearActivePosition(); setActiveLeader(false);
        showTab('FOH');
      }
    });
    segBOH.addEventListener('change', function(){
      if (segBOH.checked){
        renderPositions('BOH'); renderLeaders('BOH');
        clearActivePosition(); setActiveLeader(false);
        showTab('BOH');
      }
    });

    function setTitleFromTab(tab){ document.getElementById('title').textContent = 'Team Member Ratings – ' + tab; }

    async function showTab(tab){
      currentTab = tab;
      setTitleFromTab(tab);
      showLoading(true);
      try{
        if (dataCache[tab]) buildTable(dataCache[tab]);
        const payload = await fetchTab(tab);
        if (payload && !payload.error) buildTable(payload);
        else if (!dataCache[tab]) document.getElementById('meta').textContent = (payload && payload.error) ? payload.error : 'Error fetching data.';

        if (LEADER_SET.has(tab)){
          clearActivePosition();
          setActiveLeader(true);
        } else {
          setActiveLeader(false);
          const grp = segBOH.checked ? 'BOH' : 'FOH';
          const label = tabToLabel(grp, tab);
          if ((GROUPS[grp] || []).includes(label)) setActivePosition(label);
        }
      } finally { showLoading(false); }
    }

    async function preloadAllTabs(){
      const allTabs = [
        'FOH','BOH',
        LEADERS.FOH, LEADERS.BOH,
        ...GROUPS.FOH.map(l => labelToTab('FOH', l)),
        ...GROUPS.BOH.map(l => labelToTab('BOH', l))
      ];
      await Promise.all(allTabs.map(tab => fetchTab(tab)));
    }

    (async function init(){
      if (['BOH', ...GROUPS.BOH.map(l => labelToTab('BOH', l)), LEADERS.BOH].includes(initialTab)){
        segBOH.checked = true; segFOH.checked = false; renderPositions('BOH'); renderLeaders('BOH');
      } else {
        segFOH.checked = true; segBOH.checked = false; renderPositions('FOH'); renderLeaders('FOH');
      }

      showLoading(true);
      await loadBundle();
      await preloadAllTabs();
      await showTab(initialTab);

      if (segFOH.checked){
        const label = tabToLabel('FOH', initialTab);
        if ((GROUPS.FOH || []).includes(label)) setActivePosition(label);
      } else {
        const label = tabToLabel('BOH', initialTab);
        if ((GROUPS.BOH || []).includes(label)) setActivePosition(label);
      }
      if (LEADER_SET.has(initialTab)) { clearActivePosition(); setActiveLeader(true); }
    })();
  </script>
</body>
</html>`;
  };

  // Update iframe content when variant changes
  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(generateHTML());
        doc.close();
      }
    }
  }, [variant]);

  // Convert height and maxWidth to CSS values
  const heightValue = typeof height === 'number' ? `${height}px` : height;
  const maxWidthValue = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;

  return (
    <div 
      className={`full-pea-scoreboard ${className}`}
      style={{
        width: '100%',
        maxWidth: maxWidthValue,
        height: heightValue,
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}
    >
      <iframe
        ref={iframeRef}
        srcDoc={generateHTML()}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '8px'
        }}
        title={`${currentConfig.title} - ${variant}`}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
