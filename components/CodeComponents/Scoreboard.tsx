import * as React from "react";
import "../scoreboard.css";

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

export function Scoreboard({ bundleUrl, logoUrl, initialTab, title }: {
  bundleUrl: string; logoUrl: string; initialTab?: string; title?: string;
}) {
  const [bundle, setBundle] = React.useState<Bundle | null>(null);
  const [currentTab, setCurrentTab] = React.useState(initialTab || "FOH");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dataCache, setDataCache] = React.useState<Record<string, Payload>>({});
  const [ratingsCountIdx, setRatingsCountIdx] = React.useState(-1);
  const [activeGroup, setActiveGroup] = React.useState<"FOH" | "BOH">("FOH");
  const [panelExpanded, setPanelExpanded] = React.useState(true);

  // Render position buttons for the current group
  const renderPositionButtons = () => {
    const positions = GROUPS[activeGroup] || [];
    return positions.map(position => (
      <button
        key={position}
        className="pos-pill"
        onClick={() => {
          const tabName = POS_TAB[activeGroup][position as keyof typeof POS_TAB[typeof activeGroup]] || position;
          setCurrentTab(tabName);
        }}
        aria-pressed={currentTab === (POS_TAB[activeGroup][position as keyof typeof POS_TAB[typeof activeGroup]] || position)}
      >
        {position}
      </button>
    ));
  };

  // Render leadership button
  const renderLeadershipButton = () => {
    const leaderTab = LEADERS[activeGroup];
    return (
      <button
        className="leader-pill"
        onClick={() => setCurrentTab(leaderTab)}
        aria-pressed={currentTab === leaderTab}
      >
        Leadership View
      </button>
    );
  };

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

  // Update meta information when tab changes
  React.useEffect(() => {
    if (bundle && bundle.tabs && bundle.tabs[currentTab]) {
      const payload = bundle.tabs[currentTab];
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
    }
  }, [currentTab, bundle]);

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

    // Update title and meta
    const titleEl = document.getElementById('title');
    const metaEl = document.getElementById('meta');
    if (titleEl) titleEl.textContent = `Team Member Ratings – ${sheetName}`;
    if (metaEl) metaEl.textContent = `${sheetName} — Last updated ${updated}`;

    // View-specific guidance
    const noteEl = document.getElementById('metaNote');
    if (noteEl) {
      if (sheetName === 'FOH' || sheetName === 'BOH') {
        noteEl.innerHTML = 'Averages are based on the last 4 ratings in the respective position';
      } else if (LEADER_SET.has(sheetName)) {
        noteEl.innerHTML = 'Averages are based on the last 10 ratings by the leader in the respective position<br># of Ratings is on a rolling 90 day basis';
      } else {
        noteEl.innerHTML = 'Averages are based on the last 4 ratings in the respective position<br># of Ratings is on a rolling 90 day basis';
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
  }, [createTd, sizeColumns]);

  const showTab = React.useCallback(async (tab: string) => {
    setCurrentTab(tab);
    setLoading(true);
    
    try {
      if (dataCache[tab]) {
        buildTable(dataCache[tab]);
      }
    } finally {
      setLoading(false);
    }
  }, [dataCache, buildTable]);

  const labelToTab = React.useCallback((group: string, label: string) => {
    const map = POS_TAB[group as keyof typeof POS_TAB] || {};
    return map[label as keyof typeof map] || label;
  }, []);

  const tabToLabel = React.useCallback((group: string, tab: string) => {
    const map = POS_TAB[group as keyof typeof POS_TAB] || {};
    for (const k in map) if (map[k as keyof typeof map] === tab) return k;
    return tab;
  }, []);

  const renderPositions = React.useCallback((group: "FOH" | "BOH") => {
    const items = GROUPS[group] || [];
    // This would render position pills - simplified for now
  }, []);

  const renderLeaders = React.useCallback((group: "FOH" | "BOH") => {
    const tabName = group === 'FOH' ? LEADERS.FOH : LEADERS.BOH;
    // This would render leader pills - simplified for now
  }, []);

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
      <div className="wrap">
        <div className="spinner-wrap" style={{ display: 'flex' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="wrap">
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Data</h2>
          <p className="text-gray-600">{error || 'Failed to load scoreboard data'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="header">
        {/* Left: Rating Scale */}
        <div className="rubric" aria-label="Rating scale">
          <table className="rubric-table">
            <thead>
              <tr>
                <th className="rubric-title">Rating Scale</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="rubric-red">Not Yet = 1.0 – 1.49</td>
              </tr>
              <tr>
                <td className="rubric-yellow">On the Rise = 1.50 – 2.74</td>
              </tr>
              <tr>
                <td className="rubric-green">Crushing It = 2.75 – 3.0</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Center: Title + Controls */}
        <div className="header-center">
          <h1 id="title">Team Member Ratings – {currentTab}</h1>
          
          {/* Mobile-only control to collapse/expand */}
          <button 
            id="panelToggle" 
            className="panel-toggle" 
            aria-expanded={panelExpanded} 
            aria-controls="panelBody"
            onClick={() => setPanelExpanded(!panelExpanded)}
          >
            <span className="caret">▾</span> Options
          </button>
          
          <div id="panelBody" className="panel-body" hidden={!panelExpanded}>
            <div className="segment" role="tablist" aria-label="Area switch">
              <input 
                type="radio" 
                name="area" 
                id="segFOH" 
                value="FOH" 
                checked={activeGroup === "FOH"}
                onChange={() => {
                  setActiveGroup("FOH");
                  setCurrentTab("FOH");
                }}
              />
              <label htmlFor="segFOH" role="tab" aria-selected={activeGroup === "FOH"}>
                FOH
              </label>
              <input 
                type="radio" 
                name="area" 
                id="segBOH" 
                value="BOH" 
                checked={activeGroup === "BOH"}
                onChange={() => {
                  setActiveGroup("BOH");
                  setCurrentTab("BOH");
                }}
              />
              <label htmlFor="segBOH" role="tab" aria-selected={activeGroup === "BOH"}>
                BOH
              </label>
            </div>

            <div id="posHint" className="positions-hint">
              Click a position to see the Big 5 Breakdown:
            </div>
            <div className="positions" id="positionsBar">
              {renderPositionButtons()}
            </div>

            {/* Leader row */}
            <div className="leaders" id="leadersBar">
              {renderLeadershipButton()}
            </div>

            {/* Meta lines */}
            <div className="meta" id="meta"></div>
            <div id="metaNote" className="meta-note"></div>
            <div id="memberHint" className="positions-hint">
              Click a team member's name to see individual submissions
            </div>
          </div>
        </div>

        {/* Right: Logo */}
        <div className="header-logo">
          <img src={logoUrl} alt="Location Logo" className="logo-img" />
        </div>
      </div>

      <div className="scroll" id="scroller">
        <div id="spinnerWrap" className="spinner-wrap" aria-hidden="true">
          <div className="spinner"></div>
        </div>
        <table id="grid" aria-label="Sheet data">
          <colgroup id="colgroup"></colgroup>
          <thead>
            <tr id="head"></tr>
          </thead>
          <tbody id="body"></tbody>
        </table>
      </div>
    </div>
  );
}