/**
 * Layout engine for the org chart canvas.
 *
 * Strategy:
 *  1. Build a role→tier map and group employees by tier.
 *  2. Use ONLY explicit (DB) supervisor relationships — no inference.
 *  3. Connected nodes are laid out with dagre (directed-graph layout)
 *     which automatically centers parents above children.  We use dagre's
 *     x positions but override y with our tier bands.
 *  4. Unconnected (isolated) nodes placed per-tier, starting after any
 *     connected nodes at the same tier.
 *
 * Groups wrap members to multiple rows (max GROUP_MAX_COLS per row).
 *
 * Edges:
 *  - Solid lines for explicit supervisor relationships only.
 *  - No dashed/inferred lines.
 */
import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type {
  OrgChartData,
  OrgChartEmployee,
  OrgChartRole,
  OrgGroupWithMembers,
} from './org-chart-types';
import { ROLE_COLOR_KEYS, getRoleColor } from './role-utils';

// ─── Layout constants ────────────────────────────────────────────────────────
const CARD_WIDTH = 140;
const CARD_HEIGHT = 52;
const CARD_GAP_X = 14;       // gap between siblings
const CARD_GAP_Y = 10;       // vertical gap between rows inside groups
const CLUSTER_GAP = 32;      // gap between disconnected clusters and isolated blocks
const TIER_GAP_Y = 100;      // vertical gap between tiers
const TIER_LABEL_WIDTH = 90;
const TIER_LABEL_GAP = 16;
const START_X = TIER_LABEL_WIDTH + TIER_LABEL_GAP;

const GROUP_PADDING_X = 16;  // horizontal padding inside group boxes
const GROUP_PADDING_Y = 12;  // top padding inside group boxes
const GROUP_PADDING_BOTTOM = 16;  // bottom padding inside group boxes (matches left/right)
const GROUP_HEADER_HEIGHT = 28;
const GROUP_MAX_COLS = 5;    // default max cards per row inside a group box
const EXPANDED_MAX_COLS = 10; // max cols when a group is alone at its tier

const DEPT_PADDING = 16;
const DEPT_HEADER_HEIGHT = 24;

// Grid layout for unconnected nodes
const GRID_COLS = 10;

// ─── Default role hierarchy ──────────────────────────────────────────────────
const DEFAULT_ROLE_HIERARCHY: Record<string, number> = {
  'Owner/Operator': 1,
  Operator: 1,
  Executive: 2,
  Director: 3,
  'General Manager': 3,
  'Team Lead': 4,
  Trainer: 5,
  'Team Member': 6,
};

const DEFAULT_ROLE_COLORS: Record<string, string> = {
  'Owner/Operator': 'red',
  Operator: 'red',
  Executive: 'purple',
  Director: 'blue',
  'General Manager': 'blue',
  'Team Lead': 'green',
  Trainer: 'amber',
  'Team Member': 'teal',
};

function getDefaultHierarchyLevel(roleName: string): number {
  return DEFAULT_ROLE_HIERARCHY[roleName] ?? 6;
}

function buildFallbackRoleMap(
  employees: OrgChartEmployee[]
): Map<string, OrgChartRole> {
  const map = new Map<string, OrgChartRole>();
  const seen = new Set<string>();
  employees.forEach((e) => {
    if (!e.role || seen.has(e.role)) return;
    seen.add(e.role);
    map.set(e.role, {
      id: `fallback-${e.role}`,
      role_name: e.role,
      hierarchy_level: getDefaultHierarchyLevel(e.role),
      is_leader: [
        'Owner/Operator',
        'Operator',
        'Executive',
        'Director',
        'General Manager',
        'Team Lead',
      ].includes(e.role),
      is_trainer: e.role === 'Trainer',
      color: (DEFAULT_ROLE_COLORS[e.role] || 'blue') as any,
    });
  });
  return map;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface PlacedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── Group dimension helpers ─────────────────────────────────────────────────
function groupDims(memberCount: number, maxCols = GROUP_MAX_COLS): { cols: number; rows: number; w: number; h: number } {
  const n = Math.max(1, memberCount);
  const cols = Math.min(n, maxCols);
  const rows = Math.ceil(n / maxCols);
  // +2 accounts for 1px border on each side (box-sizing: border-box steals from content)
  const w = GROUP_PADDING_X * 2 + cols * CARD_WIDTH + (cols - 1) * CARD_GAP_X + 2;
  const h = GROUP_PADDING_Y + GROUP_HEADER_HEIGHT + rows * CARD_HEIGHT + (rows - 1) * CARD_GAP_Y + GROUP_PADDING_BOTTOM + 2;
  return { cols, rows, w, h };
}

// ─── Main layout function ────────────────────────────────────────────────────

export function computeOrgChartLayout(
  data: OrgChartData
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (data.employees.length === 0) return { nodes, edges };

  // ── 1. Lookup maps ─────────────────────────────────────────────────────────
  const employeeMap = new Map<string, OrgChartEmployee>();
  const employeeToGroup = new Map<string, string>();

  data.employees.forEach((e) => employeeMap.set(e.id, e));
  data.groups.forEach((g) => {
    g.members.forEach((m) => employeeToGroup.set(m.employee_id, g.id));
  });

  // ── 2. Role map ────────────────────────────────────────────────────────────
  const roleMap = new Map<string, OrgChartRole>();
  if (data.roles.length > 0) {
    data.roles.forEach((r) => roleMap.set(r.role_name, r));
  } else {
    buildFallbackRoleMap(data.employees).forEach((v, k) => roleMap.set(k, v));
  }

  const sortedRoles = Array.from(roleMap.values()).sort(
    (a, b) => a.hierarchy_level - b.hierarchy_level
  );

  // ── 3. Group employees by hierarchy level (tier) ───────────────────────────
  const tierEmployees = new Map<number, OrgChartEmployee[]>();
  data.employees.forEach((e) => {
    const role = roleMap.get(e.role);
    const level = role?.hierarchy_level ?? 999;
    if (!tierEmployees.has(level)) tierEmployees.set(level, []);
    tierEmployees.get(level)!.push(e);
  });
  const tierLevels = Array.from(tierEmployees.keys()).sort((a, b) => a - b);

  // ── 4. Build parent map (EXPLICIT relationships only) ─────────────────────

  /** Chart node ID for an employee (collapses grouped employees). */
  function nodeIdFor(empId: string): string {
    const gId = employeeToGroup.get(empId);
    return gId ? `group-${gId}` : `employee-${empId}`;
  }

  // Groups that are the only connected node at their tier get expanded columns.
  // Populated after parentOf + nodeTierLevel are built; read by nodeWidth/nodeHeight.
  const expandedGroups = new Set<string>();

  /** Max columns for a group node. */
  function groupMaxCols(nodeId: string): number {
    return expandedGroups.has(nodeId) ? EXPANDED_MAX_COLS : GROUP_MAX_COLS;
  }

  /** Visual width of a chart node. */
  function nodeWidth(nodeId: string): number {
    if (nodeId.startsWith('group-')) {
      const gId = nodeId.replace('group-', '');
      const group = data.groups.find((g) => g.id === gId);
      if (group) return groupDims(group.members.length, groupMaxCols(nodeId)).w;
    }
    return CARD_WIDTH;
  }

  /** Visual height of a chart node. */
  function nodeHeight(nodeId: string): number {
    if (nodeId.startsWith('group-')) {
      const gId = nodeId.replace('group-', '');
      const group = data.groups.find((g) => g.id === gId);
      if (group) return groupDims(group.members.length, groupMaxCols(nodeId)).h;
    }
    return CARD_HEIGHT;
  }

  /** Unique node IDs at a tier (de-duped for groups). */
  function uniqueNodeIdsAtTier(level: number): string[] {
    const emps = tierEmployees.get(level) || [];
    const ids: string[] = [];
    const seen = new Set<string>();
    emps.forEach((emp) => {
      const nid = nodeIdFor(emp.id);
      if (!seen.has(nid)) { seen.add(nid); ids.push(nid); }
    });
    return ids;
  }

  // Only explicit parents from the database — NO inference
  const parentOf = new Map<string, string>();

  // 4a. Employee → employee/group relationships
  data.employees.forEach((emp) => {
    const childNodeId = nodeIdFor(emp.id);
    let parentId: string | null = null;

    if (emp.direct_supervisor_id) parentId = nodeIdFor(emp.direct_supervisor_id);
    else if (emp.supervisor_group_id) parentId = `group-${emp.supervisor_group_id}`;
    if (!parentId || parentId === childNodeId) return;

    // Only count if parent node exists in the chart data
    const pEmpId = parentId.startsWith('employee-') ? parentId.replace('employee-', '') : null;
    const pGrpId = parentId.startsWith('group-') ? parentId.replace('group-', '') : null;
    const inChart = pEmpId
      ? employeeMap.has(pEmpId)
      : pGrpId
        ? data.groups.some((g) => g.id === pGrpId)
        : false;
    if (inChart) parentOf.set(childNodeId, parentId);
  });

  // 4b. Group → group relationships (supervisor_group_id on org_groups)
  data.groups.forEach((group) => {
    if (!group.supervisor_group_id) return;
    const childNodeId = `group-${group.id}`;
    const parentNodeId = `group-${group.supervisor_group_id}`;
    if (childNodeId === parentNodeId) return;
    // Verify parent group exists in chart data
    const parentExists = data.groups.some((g) => g.id === group.supervisor_group_id);
    if (parentExists) parentOf.set(childNodeId, parentNodeId);
  });

  // childrenOf lookup
  const childrenOf = new Map<string, string[]>();
  parentOf.forEach((parentId, childId) => {
    if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
    childrenOf.get(parentId)!.push(childId);
  });

  // ── 5. Tier positioning ────────────────────────────────────────────────────
  const nodeTierLevel = new Map<string, number>();
  tierLevels.forEach((level) => {
    uniqueNodeIdsAtTier(level).forEach((nid) => nodeTierLevel.set(nid, level));
  });

  // ── Identify connected nodes early (needed for expanded group detection) ────
  const connectedNodeIds = new Set<string>();
  parentOf.forEach((parentId, childId) => {
    if (nodeTierLevel.has(parentId) && nodeTierLevel.has(childId)) {
      connectedNodeIds.add(parentId);
      connectedNodeIds.add(childId);
    }
  });

  // Determine which groups should expand to EXPANDED_MAX_COLS.
  // A group expands when it's the only connected node at its tier.
  connectedNodeIds.forEach((nid) => {
    if (!nid.startsWith('group-')) return;
    const tier = nodeTierLevel.get(nid);
    if (tier === undefined) return;
    let alone = true;
    connectedNodeIds.forEach((other) => {
      if (other !== nid && nodeTierLevel.get(other) === tier) alone = false;
    });
    if (alone) expandedGroups.add(nid);
  });

  // Pre-compute tier heights
  const tierHeightMap = new Map<number, number>();
  tierLevels.forEach((level) => {
    const nodeIds = uniqueNodeIdsAtTier(level);
    let baseHeight = CARD_HEIGHT;
    nodeIds.forEach((nid) => {
      baseHeight = Math.max(baseHeight, nodeHeight(nid));
    });

    // Also account for unconnected card grids that may need multiple rows
    const unconnected = nodeIds.filter((nid) => !parentOf.has(nid) && !childrenOf.has(nid));
    const isTopTier = level === tierLevels[0];
    const unconnectedCards = unconnected.filter((nid) => !nid.startsWith('group-'));
    if (!isTopTier && unconnectedCards.length > GRID_COLS) {
      const rows = Math.ceil(unconnectedCards.length / GRID_COLS);
      const gridHeight = rows * (CARD_HEIGHT + CARD_GAP_Y) - CARD_GAP_Y;
      baseHeight = Math.max(baseHeight, gridHeight);
    }

    tierHeightMap.set(level, baseHeight);
  });

  // Tier Y offsets
  const tierYMap = new Map<number, number>();
  let cumulativeY = 0;
  tierLevels.forEach((level) => {
    tierYMap.set(level, cumulativeY);
    const tierH = tierHeightMap.get(level) || CARD_HEIGHT;
    cumulativeY += tierH + TIER_GAP_Y;
  });

  // ── 6. Placement ──────────────────────────────────────────────────────────

  // Track rightmost placed edge per tier (used to start isolated nodes)
  const tierMaxRight = new Map<number, number>();
  const employeePositions = new Map<string, PlacedRect>();
  const groupPositions = new Map<string, PlacedRect>();

  // ── placeNode helper ──────────────────────────────────────────────────────
  function placeNode(nodeId: string, x: number, y: number) {
    const w = nodeWidth(nodeId);

    // Track rightmost edge per tier
    const tier = nodeTierLevel.get(nodeId);
    if (tier !== undefined) {
      const rightEdge = x + w;
      tierMaxRight.set(tier, Math.max(tierMaxRight.get(tier) || 0, rightEdge));
    }

    if (nodeId.startsWith('group-')) {
      const gId = nodeId.replace('group-', '');
      const group = data.groups.find((g) => g.id === gId);
      if (!group) return;

      const memberEmployees = group.members
        .map((m) => employeeMap.get(m.employee_id))
        .filter(Boolean) as OrgChartEmployee[];

      const mc = groupMaxCols(nodeId);
      const dims = groupDims(memberEmployees.length, mc);

      nodes.push({
        id: nodeId,
        type: 'groupBox',
        position: { x, y },
        data: {
          group,
          members: memberEmployees,
          role: roleMap.get(group.role_name),
          maxCols: mc,
        },
        style: { width: dims.w, height: dims.h },
        draggable: false,
        selectable: false,
      });

      groupPositions.set(gId, { x, y, w: dims.w, h: dims.h });

      memberEmployees.forEach((emp, i) => {
        const col = i % mc;
        const row = Math.floor(i / mc);
        employeePositions.set(emp.id, {
          x: x + GROUP_PADDING_X + col * (CARD_WIDTH + CARD_GAP_X),
          y: y + GROUP_PADDING_Y + GROUP_HEADER_HEIGHT + row * (CARD_HEIGHT + CARD_GAP_Y),
          w: CARD_WIDTH,
          h: CARD_HEIGHT,
        });
      });
    } else {
      const empId = nodeId.replace('employee-', '');
      const emp = employeeMap.get(empId);
      if (!emp) return;

      nodes.push({
        id: nodeId,
        type: 'employeeCard',
        position: { x, y },
        data: { employee: emp, role: roleMap.get(emp.role) },
        style: { width: CARD_WIDTH, height: CARD_HEIGHT },
        draggable: false,
        selectable: false,
      });

      employeePositions.set(empId, { x, y, w: CARD_WIDTH, h: CARD_HEIGHT });
    }
  }

  // ── Collect all chart node IDs ────────────────────────────────────────────
  const allNodeIds = new Set<string>();
  tierLevels.forEach((level) => {
    uniqueNodeIdsAtTier(level).forEach((nid) => allNodeIds.add(nid));
  });

  // ── Identify isolated (unconnected) nodes ──────────────────────────────────
  const isolated: string[] = [];
  allNodeIds.forEach((nid) => {
    if (!connectedNodeIds.has(nid)) isolated.push(nid);
  });

  // ── 6a. Layout connected nodes with dagre ──────────────────────────────────
  //
  // dagre handles centering parents above children automatically.
  // We find each disconnected component, sort them by root hierarchy level
  // (so the highest-level tree comes first / leftmost), run dagre on each,
  // then place them left-to-right.

  if (connectedNodeIds.size > 0) {
    // --- Find disconnected components via DFS ---
    const componentOf = new Map<string, number>();
    let nextCompId = 0;

    const dfs = (nid: string, compId: number): void => {
      if (componentOf.has(nid)) return;
      componentOf.set(nid, compId);
      // Walk children
      const children = childrenOf.get(nid) || [];
      children.forEach((c) => { if (connectedNodeIds.has(c)) dfs(c, compId); });
      // Walk parent
      const parent = parentOf.get(nid);
      if (parent && connectedNodeIds.has(parent)) dfs(parent, compId);
    };

    connectedNodeIds.forEach((nid) => {
      if (!componentOf.has(nid)) {
        dfs(nid, nextCompId);
        nextCompId++;
      }
    });

    // Group nodes by component
    const compNodes = new Map<number, Set<string>>();
    componentOf.forEach((compId, nid) => {
      if (!compNodes.has(compId)) compNodes.set(compId, new Set());
      compNodes.get(compId)!.add(nid);
    });

    // Sort components: lowest root tier first (highest hierarchy = leftmost)
    const sortedComps = Array.from(compNodes.entries())
      .map(([compId, nodeSet]) => {
        let minTier = 999;
        nodeSet.forEach((nid) => {
          const tier = nodeTierLevel.get(nid) ?? 999;
          if (tier < minTier) minTier = tier;
        });
        return { compId, nodeSet, rootTier: minTier };
      })
      .sort((a, b) => a.rootTier - b.rootTier);

    // --- Layout each component with dagre ---
    //
    // Components that don't share any tier levels can start at the same x
    // (they won't overlap because they occupy different vertical bands).
    // Only offset right if tiers actually overlap with already-placed nodes.

    sortedComps.forEach(({ nodeSet }) => {
      // Determine which tiers this component spans
      const compTiers = new Set<number>();
      nodeSet.forEach((nid) => {
        const tier = nodeTierLevel.get(nid);
        if (tier !== undefined) compTiers.add(tier);
      });

      // Find the max right edge across all tiers this component uses
      let startX = START_X;
      compTiers.forEach((tier) => {
        const right = tierMaxRight.get(tier) || 0;
        if (right > 0) startX = Math.max(startX, right + CLUSTER_GAP);
      });

      const g = new dagre.graphlib.Graph();
      g.setGraph({
        rankdir: 'TB',
        nodesep: CARD_GAP_X,
        ranksep: TIER_GAP_Y,
        marginx: 0,
        marginy: 0,
      });
      g.setDefaultEdgeLabel(() => ({}));

      // Add nodes for this component
      nodeSet.forEach((nid) => {
        g.setNode(nid, {
          width: nodeWidth(nid),
          height: nodeHeight(nid),
        });
      });

      // Add edges within this component
      parentOf.forEach((parentId, childId) => {
        if (nodeSet.has(parentId) && nodeSet.has(childId)) {
          g.setEdge(parentId, childId);
        }
      });

      // Run dagre
      dagre.layout(g);

      // Find min x (dagre reports center, convert to left edge)
      let minX = Infinity;
      nodeSet.forEach((nid) => {
        const dn = g.node(nid);
        if (dn) minX = Math.min(minX, dn.x - nodeWidth(nid) / 2);
      });

      const xOff = startX - (Number.isFinite(minX) ? minX : 0);

      // Place each node: dagre x + offset, tier y from our map
      nodeSet.forEach((nid) => {
        const dn = g.node(nid);
        if (!dn) return;
        const tierLevel = nodeTierLevel.get(nid);
        if (tierLevel === undefined) return;
        const tierY = tierYMap.get(tierLevel)!;
        const x = dn.x - nodeWidth(nid) / 2 + xOff;
        placeNode(nid, x, tierY);
      });
    });
  }

  // ── Compute edge crossing zones ──────────────────────────────────────────
  //
  // When an edge spans multiple tiers (e.g. Shift Leaders at tier 4 →
  // Team Members at tier 6), it crosses through intermediate tiers.
  // Isolated nodes at those intermediate tiers must avoid overlapping
  // with the edge path.

  const tierEdgeCrossings = new Map<number, Array<{ minX: number; maxX: number }>>();
  const EDGE_BUFFER = CARD_GAP_X * 2; // padding each side of edge path

  parentOf.forEach((parentId, childId) => {
    if (!connectedNodeIds.has(parentId) || !connectedNodeIds.has(childId)) return;

    const parentTier = nodeTierLevel.get(parentId);
    const childTier = nodeTierLevel.get(childId);
    if (parentTier === undefined || childTier === undefined) return;

    const lowerTier = Math.min(parentTier, childTier);
    const upperTier = Math.max(parentTier, childTier);
    if (upperTier - lowerTier <= 1) return; // adjacent tiers — no intermediate crossing

    // Find placed positions of parent and child
    const parentNode = nodes.find((n) => n.id === parentId);
    const childNode = nodes.find((n) => n.id === childId);
    if (!parentNode || !childNode) return;

    const parentCenterX = parentNode.position.x + nodeWidth(parentId) / 2;
    const childCenterX = childNode.position.x + nodeWidth(childId) / 2;

    const edgeMinX = Math.min(parentCenterX, childCenterX) - EDGE_BUFFER;
    const edgeMaxX = Math.max(parentCenterX, childCenterX) + EDGE_BUFFER;

    // Mark all tiers between parent and child (exclusive) as having crossings
    tierLevels.forEach((level) => {
      if (level > lowerTier && level < upperTier) {
        if (!tierEdgeCrossings.has(level)) tierEdgeCrossings.set(level, []);
        tierEdgeCrossings.get(level)!.push({ minX: edgeMinX, maxX: edgeMaxX });
      }
    });
  });

  // ── 6b. Place isolated (unconnected) nodes — per tier, independently ──────
  //
  // Each tier gets its own cursor so isolated nodes don't cascade across tiers.
  // If edge crossings pass through this tier, skip grid positions that overlap.
  const isolatedByTier = new Map<number, string[]>();
  isolated.forEach((nid) => {
    const tier = nodeTierLevel.get(nid)!;
    if (!isolatedByTier.has(tier)) isolatedByTier.set(tier, []);
    isolatedByTier.get(tier)!.push(nid);
  });

  tierLevels.forEach((level) => {
    const isoNodes = isolatedByTier.get(level) || [];
    if (isoNodes.length === 0) return;

    const tierY = tierYMap.get(level)!;

    // Start isolated nodes after any connected nodes already placed at this tier
    const rightEdge = tierMaxRight.get(level) || 0;
    let tierCursor = rightEdge > 0 ? rightEdge + CLUSTER_GAP : START_X;

    const isoGroups = isoNodes.filter((nid) => nid.startsWith('group-'));
    const isoCards = isoNodes.filter((nid) => !nid.startsWith('group-'));
    const crossings = tierEdgeCrossings.get(level) || [];

    // Place isolated groups (with edge-crossing avoidance)
    isoGroups.forEach((nid) => {
      const w = nodeWidth(nid);
      // Skip past any edge crossing zones that would overlap this group
      if (crossings.length > 0) {
        let attempts = 0;
        while (attempts < 50) {
          const nxRight = tierCursor + w;
          const blocking = crossings.find((c) => tierCursor < c.maxX && nxRight > c.minX);
          if (!blocking) break;
          tierCursor = blocking.maxX + CARD_GAP_X;
          attempts++;
        }
      }
      placeNode(nid, tierCursor, tierY);
      tierCursor += w + CLUSTER_GAP;
    });

    // Place isolated cards in a grid, skipping positions that overlap edge crossings
    if (isoCards.length > 0) {
      const gridStartX = tierCursor;

      // Build list of safe x-positions (skipping those that overlap with crossing zones)
      const safeXPositions: number[] = [];
      for (let ci = 0; safeXPositions.length < Math.max(GRID_COLS, isoCards.length); ci++) {
        const nx = gridStartX + ci * (CARD_WIDTH + CARD_GAP_X);
        const nxRight = nx + CARD_WIDTH;
        const overlaps = crossings.some((c) => nx < c.maxX && nxRight > c.minX);
        if (!overlaps) safeXPositions.push(nx);
        if (ci > 200) break; // safety limit
      }

      const effectiveCols = Math.min(GRID_COLS, safeXPositions.length);
      isoCards.forEach((nid, i) => {
        const col = i % effectiveCols;
        const row = Math.floor(i / effectiveCols);
        const nx = safeXPositions[col] ?? gridStartX;
        const ny = tierY + row * (CARD_HEIGHT + CARD_GAP_Y);
        placeNode(nid, nx, ny);
      });
    }
  });

  // ── Tier labels ───────────────────────────────────────────────────────────
  tierLevels.forEach((level) => {
    const tierY = tierYMap.get(level)!;
    const role = sortedRoles.find((r) => r.hierarchy_level === level);
    if (role) {
      nodes.push({
        id: `tier-${level}`,
        type: 'tierLabel',
        position: { x: 0, y: tierY + (CARD_HEIGHT - 40) / 2 },
        data: { role },
        draggable: false,
        selectable: false,
      });
    }
  });

  // ── 7. Department boxes ────────────────────────────────────────────────────
  //
  // Departments contain groups. Employees inherit department membership from
  // their group, but can also be assigned individually (override).
  // Colors are dynamically assigned from the palette, skipping colors already
  // used by the org's roles.

  const usedRoleColors = new Set<string>();
  data.roles.forEach((r) => { if (r.color) usedRoleColors.add(r.color); });
  const availDeptColors = ROLE_COLOR_KEYS.filter((c) => !usedRoleColors.has(c));

  data.departments.forEach((dept, deptIdx) => {
    // Groups assigned to this department
    const deptGroups = data.groups.filter((g) => g.department_id === dept.id);

    // Employees: from department groups (inherited) + individually assigned
    const deptEmpIds = new Set<string>();
    deptGroups.forEach((g) => {
      g.members.forEach((m) => deptEmpIds.add(m.employee_id));
    });
    data.employees.forEach((e) => {
      if (e.department_id === dept.id) deptEmpIds.add(e.id);
    });

    if (deptEmpIds.size === 0 && deptGroups.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Include individual employee positions
    deptEmpIds.forEach((empId) => {
      const pos = employeePositions.get(empId);
      if (!pos) return;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + pos.w);
      maxY = Math.max(maxY, pos.y + pos.h);
    });

    // Include group box positions
    deptGroups.forEach((g) => {
      const gPos = groupPositions.get(g.id);
      if (!gPos) return;
      minX = Math.min(minX, gPos.x);
      minY = Math.min(minY, gPos.y);
      maxX = Math.max(maxX, gPos.x + gPos.w);
      maxY = Math.max(maxY, gPos.y + gPos.h);
    });

    if (minX === Infinity) return;

    // Dynamic color: pick from unused role colors, cycling if exhausted
    const colorPool = availDeptColors.length > 0 ? availDeptColors : ROLE_COLOR_KEYS;
    const colorKey = colorPool[deptIdx % colorPool.length];
    const deptColor = getRoleColor(colorKey);

    nodes.push({
      id: `dept-${dept.id}`,
      type: 'departmentBox',
      position: {
        x: minX - DEPT_PADDING,
        y: minY - DEPT_PADDING - DEPT_HEADER_HEIGHT,
      },
      data: { department: dept, color: deptColor },
      style: {
        width: maxX - minX + DEPT_PADDING * 2,
        height: maxY - minY + DEPT_PADDING * 2 + DEPT_HEADER_HEIGHT,
      },
      zIndex: -1,
      draggable: false,
      selectable: false,
    });
  });

  // ── 8. Edges (explicit only — solid lines) ────────────────────────────────
  const edgeSet = new Set<string>();
  const placedNodeIds = new Set(nodes.map((n) => n.id));

  parentOf.forEach((parentId, childId) => {
    const key = `${parentId}-->${childId}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);

    if (!placedNodeIds.has(parentId) || !placedNodeIds.has(childId)) return;

    // Use straight edge when source and target are nearly vertically aligned
    // to avoid the slight S-curve that smoothstep produces on tiny x offsets
    const parentNode = nodes.find((n) => n.id === parentId);
    const childNode = nodes.find((n) => n.id === childId);
    let edgeType = 'smoothstep';
    if (parentNode && childNode) {
      const parentCenterX = parentNode.position.x + nodeWidth(parentId) / 2;
      const childCenterX = childNode.position.x + nodeWidth(childId) / 2;
      if (Math.abs(parentCenterX - childCenterX) < 8) {
        edgeType = 'straight';
      }
    }

    edges.push({
      id: `edge-${key}`,
      source: parentId,
      sourceHandle: 'source',
      target: childId,
      targetHandle: 'target',
      type: edgeType,
      style: { stroke: '#475569', strokeWidth: 2 },
    });
  });

  return { nodes, edges };
}
