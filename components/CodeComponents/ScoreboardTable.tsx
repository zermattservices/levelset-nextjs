import * as React from "react";

type Payload = { header: (string|number)[]; rows: (string|number)[][]; sheetName: string; updated: string };
type Bundle = { tabs: Record<string, Payload> };

const GROUPS = {
  FOH: ["iPOS","Host","OMD","Runner","Bagging","Drinks 1/3","Drinks 2","3H Values","Trainer","Team Lead"],
  BOH: ["Breading","Secondary","Fries","Primary","Machines","Prep","3H Values","Trainer","Team Lead"]
};

const POS_TAB = {
  FOH: { "3H Values": "3H FOH", "Trainer": "FOH Trainer", "Team Lead": "FOH Team Lead" },
  BOH: { "3H Values": "3H BOH", "Trainer": "BOH Trainer", "Team Lead": "BOH Team Lead" }
};

// Column configurations from Google Apps Script
const COLS_BY_TAB = {
  'FOH': 12,
  'BOH': 11,
  'FOH Leadership': 14,
  'BOH Leadership': 13
};

const LEADERS = { FOH: "FOH Leadership", BOH: "BOH Leadership" };
const LEADER_SET = new Set([LEADERS.FOH, LEADERS.BOH]);
const POSITION_TAB_SET = new Set([
  ...GROUPS.FOH.map(l => POS_TAB.FOH[l as keyof typeof POS_TAB.FOH] || l),
  ...GROUPS.BOH.map(l => POS_TAB.BOH[l as keyof typeof POS_TAB.BOH] || l)
]);

function isPureNumber(s: any) { 
  return /^\s*\d+(\.\d+)?\s*$/.test(String(s)); 
}

function strip(v: any) {
  return String(v ?? '').replace(/[\s\u00A0\u2007\u202F]+/g, '').trim();
}

function lastNonEmptyIndex(arr: any[]) {
  for (let i = arr.length - 1; i >= 0; i--) if (strip(arr[i]) !== '') return i;
  return -1;
}

export interface ScoreboardTableProps {
  bundleUrl: string;
  currentTab: string;
  activeGroup: "FOH" | "BOH";
  onTabChange?: (tab: string) => void;
  className?: string;
}

export function ScoreboardTable({ 
  bundleUrl, 
  currentTab, 
  activeGroup, 
  onTabChange,
  className = "" 
}: ScoreboardTableProps) {
  const [bundle, setBundle] = React.useState<Bundle | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dataCache, setDataCache] = React.useState<Record<string, Payload>>({});
  const [ratingsCountIdx, setRatingsCountIdx] = React.useState(-1);

  // Load bundle data
  React.useEffect(() => {
    async function loadBundle() {
      try {
        setLoading(true);
        const response = await fetch(bundleUrl + "?v=" + Date.now(), { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data.tabs) throw new Error('Invalid bundle schema');
        setBundle(data);
        
        // Cache all tabs
        const cache: Record<string, Payload> = {};
        for (const [tab, payload] of Object.entries(data.tabs)) {
          cache[tab] = payload as Payload;
        }
        setDataCache(cache);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setBundle(null);
      } finally {
        setLoading(false);
      }
    }
    loadBundle();
  }, [bundleUrl]);

  const currentData = dataCache[currentTab];

  const sizeColumns = React.useCallback((cols: number) => {
    const colgroup = document.getElementById('colgroup');
    if (!colgroup) return;

    // Ensure we have the right number of col elements
    while (colgroup.children.length < cols) {
      const col = document.createElement('col');
      colgroup.appendChild(col);
    }
    while (colgroup.children.length > cols) {
      colgroup.lastElementChild?.remove();
    }

    const containerW = document.getElementById('scroller')?.clientWidth || 0;
    const widths = new Array(cols).fill(0);
    
    // Fixed widths for specific columns
    widths[0] = 50; // First column (usually empty or small)
    
    // Calculate widths for other columns
    for (let i = 2; i < cols; i++) {
      const th = document.querySelector(`#head th:nth-child(${i + 1})`) as HTMLElement;
      if (th) {
        const textW = th.textContent ? th.textContent.length * 8 + 24 : 80;
        widths[i] = Math.max(80, textW);
      } else {
        widths[i] = 80;
      }
    }
    
    // Calculate remaining width for name column
    const fixedSum = widths.reduce((a, w, idx) => idx === 1 ? a : a + w, 0);
    widths[1] = Math.max(150, containerW - fixedSum);
    
    // Apply widths
    Array.from(colgroup.children).forEach((col, i) => {
      (col as HTMLElement).style.width = `${widths[i]}px`;
    });
  }, []);

  // Handle window resize for column sizing
  React.useEffect(() => {
    const handleResize = () => {
      if (currentData) {
        const cols = COLS_BY_TAB[currentTab as keyof typeof COLS_BY_TAB] || currentData.header.length;
        sizeColumns(cols);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentData, currentTab, sizeColumns]);

  const createTd = React.useCallback((val: any, colIndex: number, cols: number, isLeaderTab: boolean) => {
    const d = document.createElement('td');
    const display = (val == null ? '' : String(val));
    d.textContent = display;

    if (colIndex === ratingsCountIdx) {
      d.style.color = 'var(--text)';
      d.style.textAlign = 'center';
      return d;
    }

    if (colIndex === 1 && display) d.title = display;
    if (colIndex === 2) d.style.textAlign = 'center';

    const isLeaderLastCol = isLeaderTab && (colIndex === cols - 1);
    if (!isLeaderLastCol && isPureNumber(display)) {
      const num = parseFloat(display);
      d.classList.add('num');
      if (num >= 2.75) d.classList.add('v-green');
      else if (num >= 1.75) d.classList.add('v-yellow');
      else if (num >= 1.0) d.classList.add('v-red');
    } else if (isLeaderLastCol && isPureNumber(display)) {
      d.style.textAlign = 'center';
    }

    return d;
  }, [ratingsCountIdx]);

  const buildTable = React.useCallback((payload: Payload) => {
    if (!payload) return;

    let header = payload.header.slice();
    let rows = payload.rows.map(r => r.slice());
    const sheetName = payload.sheetName;
    const updated = payload.updated;

    const isLeaderTab = LEADER_SET.has(sheetName);
    const isPosition = POSITION_TAB_SET.has(sheetName);

    // Find ratings count column
    const ratingsIdx = header.findIndex(h => 
      typeof h === 'string' && /#\s*of\s*ratings/i.test(h)
    );
    setRatingsCountIdx(ratingsIdx);

    // Use column configuration from Google Apps Script or calculate dynamically
    let cols: number;
    if (COLS_BY_TAB[sheetName as keyof typeof COLS_BY_TAB]) {
      // Use predefined column count from Apps Script
      cols = COLS_BY_TAB[sheetName as keyof typeof COLS_BY_TAB];
      header = header.slice(0, cols);
      rows = rows.map(r => r.slice(0, cols));
    } else {
      // Dynamic column calculation for position tabs
      let last = lastNonEmptyIndex(header);
      rows.forEach(r => {
        last = Math.max(last, lastNonEmptyIndex(r));
      });
      cols = (last >= 0 ? last + 1 : header.length);
      header = header.slice(0, cols);
      rows = rows.map(r => r.slice(0, cols));

      // Position pages: drop the extra trailing empty col
      if (isPosition && cols > 0) {
        cols -= 1;
        header = header.slice(0, cols);
        rows = rows.map(r => r.slice(0, cols));
      }
    }

    // Update meta information
    const metaElement = document.getElementById('meta');
    const metaNoteElement = document.getElementById('metaNote');
    
    if (metaElement) {
      metaElement.textContent = `${payload.sheetName} — Last updated ${payload.updated}`;
    }
    
    if (metaNoteElement) {
      if (currentTab === 'FOH' || currentTab === 'BOH') {
        metaNoteElement.innerHTML = 'Averages are based on the last 4 ratings in the respective position';
      } else if (LEADER_SET.has(currentTab)) {
        metaNoteElement.innerHTML = 'Averages are based on the last 10 ratings by the leader in the respective position<br># of Ratings is on a rolling 90 day basis';
      } else {
        metaNoteElement.innerHTML = 'Averages are based on the last 4 ratings in the respective position<br># of Ratings is on a rolling 90 day basis';
      }
    }

    // Update grid classes
    const grid = document.getElementById('grid');
    if (grid) {
      grid.classList.toggle('has-divider', isPosition || isLeaderTab);
    }

    // Build table structure
    const thead = (grid as HTMLTableElement)?.tHead;
    const headTr = document.getElementById('head');
    if (headTr) headTr.innerHTML = '';
    thead?.querySelectorAll('tr.second-head').forEach(n => n.remove());

    // Header row 1
    header.forEach(function(h) {
      const th = document.createElement('th');
      th.textContent = String(h || "");
      headTr?.appendChild(th);
    });

    // Second sticky for position pages
    if (isPosition && rows.length) {
      const firstData = rows.shift();
      const secondSticky = document.createElement('tr');
      secondSticky.className = 'second-head';
      for (let c = 0; c < cols; c++) {
        const th = document.createElement('th');
        const val = firstData?.[c];
        th.textContent = val ? String(val) : '';
        
        if (c !== ratingsIdx && isPureNumber(val)) {
          const num = parseFloat(String(val));
          th.classList.add('num');
          if (num >= 2.75) th.classList.add('v-green');
          else if (num >= 1.75) th.classList.add('v-yellow');
          else if (num >= 1.0) th.classList.add('v-red');
        }
        
        secondSticky.appendChild(th);
      }
      thead?.appendChild(secondSticky);
    }

    // Build tbody with grouping
    const tbody = document.getElementById('body');
    if (tbody) tbody.innerHTML = '';

    let groupId = 0, currentId: string | null = null, childCount = 0;

    const isHeadRow = (r: any[]) => (strip(r[0]) === '' && strip(r[1]) !== '');
    const isChildRow = (r: any[]) => (strip(r[0]) !== '');

    rows.forEach(r => {
      if (isHeadRow(r)) {
        groupId += 1;
        currentId = 'g' + groupId;
        childCount = 0;
        const tr = document.createElement('tr');
        tr.className = 'group-head';
        tr.dataset.group = currentId;
        tr.setAttribute('aria-expanded', 'false');

        tr.appendChild(createTd(r[0], 0, cols, isLeaderTab));
        
        const nameTd = document.createElement('td');
        const btn = document.createElement('span');
        btn.className = 'toggle';
        btn.setAttribute('role', 'button');
        btn.setAttribute('tabindex', '0');
        btn.innerHTML = '<span class="chev">▸</span>' + (r[1] || '');
        nameTd.appendChild(btn);
        tr.appendChild(nameTd);

        for (let c = 2; c < cols; c++) {
          tr.appendChild(createTd(r[c], c, cols, isLeaderTab));
        }
        tbody?.appendChild(tr);
      } else if (currentId && isChildRow(r)) {
        if (!isLeaderTab || childCount < 10) {
          const tr = document.createElement('tr');
          tr.className = 'group-child';
          tr.dataset.parent = currentId;
          for (let c = 0; c < cols; c++) {
            tr.appendChild(createTd(r[c], c, cols, isLeaderTab));
          }
          tbody?.appendChild(tr);
          if (isLeaderTab) childCount += 1;
        }
      }
    });

    // Size columns after building the table
    setTimeout(() => sizeColumns(cols), 0);
  }, [createTd, sizeColumns, currentTab]);

  React.useEffect(() => {
    if (currentData) {
      buildTable(currentData);
    }
  }, [currentData, buildTable]);

  // Add event listeners for group expansion
  React.useEffect(() => {
    const grid = document.getElementById('grid');
    if (!grid) return;

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const headTr = target.closest('tr.group-head');
      if (!headTr) return;

      const expanded = headTr.getAttribute('aria-expanded') === 'true';
      headTr.setAttribute('aria-expanded', (!expanded).toString());
      
      const groupId = (headTr as HTMLElement).dataset.group;
      if (groupId) {
        const childRows = document.querySelectorAll(`tr.group-child[data-parent="${groupId}"]`);
        childRows.forEach(tr => {
          (tr as HTMLElement).style.display = !expanded ? 'table-row' : 'none';
        });
      }
    };

    grid.addEventListener('click', handleClick);
    return () => grid.removeEventListener('click', handleClick);
  }, [currentData]);

  if (loading && !currentData) {
    return (
      <div className={`scoreboard-table-container ${className}`} data-plasmic-name="scoreboard-table-container">
        <div className="spinner-wrap" style={{ display: 'flex' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className={`scoreboard-table-container ${className}`} data-plasmic-name="scoreboard-table-container">
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Data</h2>
          <p className="text-gray-600">{error || 'Failed to load scoreboard data'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`scoreboard-table-container ${className}`} data-plasmic-name="scoreboard-table-container">
      <div className="scroll" id="scroller">
        <div id="spinnerWrap" className="spinner-wrap" aria-hidden="true">
          <div className="spinner"></div>
        </div>
        <table id="grid" aria-label="Sheet data" style={{ maxWidth: '1000px', maxHeight: '500px' }}>
          <colgroup id="colgroup"></colgroup>
          <thead>
            <tr id="head"></tr>
          </thead>
          <tbody id="body"></tbody>
        </table>
      </div>
      
      {/* Meta information */}
      <div className="meta" id="meta"></div>
      <div id="metaNote" className="meta-note"></div>
    </div>
  );
}

