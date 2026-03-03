"use client";

import * as React from "react";
import {
  Dialog,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Button,
  Link,
  Step,
  Stepper,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  Menu,
  MenuItem,
  CircularProgress,
  Switch,
  FormControlLabel,
  Select,
  FormControl,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SyncIcon from "@mui/icons-material/Sync";
import LaunchIcon from "@mui/icons-material/Launch";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { styled } from "@mui/material/styles";
import { DataGridPro, GridColDef } from "@mui/x-data-grid-pro";
import type { Employee, AvailabilityType } from "@/lib/supabase.types";
import { RolePill } from "./shared/RolePill";
import { createSupabaseClient } from "@/util/supabase/component";
import type { SchedulingSyncAnalysis } from "@/lib/hotschedules.types";


export interface SyncEmployeesModalProps {
  open: boolean;
  onClose: () => void;
  locationId?: string;
  orgId?: string;
  className?: string;
  onSyncComplete?: () => void; // Callback to refresh RosterTable
  /** When true, skips employee review and goes directly to position mapping + schedule import */
  scheduleImportMode?: boolean;
  /** When true, defaults the schedule sync toggle to on */
  defaultScheduleSync?: boolean;
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = 'var(--ls-color-brand)';
const warningColor = '#FACC15';
const destructiveColor = '#dc2626';

// Styled components matching RosterTable
const RoleMenuItem = styled(MenuItem)(() => ({
  fontFamily: `"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  fontSize: 12,
  fontWeight: 500,
  padding: "8px 12px",
  margin: "2px 8px",
  borderRadius: 8,
  "&.Mui-selected": {
    backgroundColor: "var(--ls-color-muted-soft)",
    "&:hover": {
      backgroundColor: "var(--ls-color-muted-border)",
    },
  },
  "&:hover": {
    backgroundColor: "var(--ls-color-neutral-foreground)",
  },
}));

const AvailabilityChip = styled(Box)(() => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "0 16px",
  minHeight: 28,
  height: 28,
  borderRadius: 14,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: `"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  cursor: "pointer",
  transition: "all 0.15s ease-in-out",
  backgroundColor: "var(--ls-color-muted-soft)",
  color: "var(--ls-color-neutral-soft-foreground)",
  "&.available": {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  "&.limited": {
    backgroundColor: "#fef3c7",
    color: "#d97706",
  },
  "&:hover": {
    opacity: 0.9,
    transform: "scale(1.02)",
  },
}));

type Page = 'instructions' | 'config' | 'review' | 'position_mapping' | 'schedule_review' | 'confirmation';

interface SyncNotification {
  id: string;
  location_id: string;
  org_id: string;
  sync_data: {
    new_employees: Array<{
      id: string;
      hs_id: number | null;
      email: string;
      first_name: string;
      last_name: string;
      hire_date: string | null;
    }>;
    modified_employees: Array<{
      id: string;
      hs_id: number | null;
      email: string;
      first_name: string;
      last_name: string;
    }>;
    terminated_employees: Array<{
      id: string;
      hs_id: number | null;
      email: string;
      first_name: string;
      last_name: string;
    }>;
    has_scheduling_data?: boolean;
    week_start_date?: string;
    scheduling?: SchedulingSyncAnalysis;
  };
  created_at: string;
  viewed: boolean;
}

interface EmployeeEdit {
  id: string;
  role?: string;
  is_foh?: boolean;
  is_boh?: boolean;
  availability?: AvailabilityType;
}

interface ExistingEmployee {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  role: string | null;
}


// Column creation function moved outside component to avoid closure issues
// This prevents React from seeing hooks called conditionally
function createEmployeeColumns(
  editable: boolean,
  showKeepButton: boolean,
  showMatchColumn: boolean,
  dependencies: {
    roleMenuAnchor: Record<string, HTMLElement | null>;
    handleRoleMenuOpen: (e: React.MouseEvent<HTMLElement>, employeeId: string) => void;
    handleRoleMenuClose: (employeeId: string) => void;
    handleRoleSelect: (employeeId: string, role: string) => void;
    employeeEdits: Map<string, EmployeeEdit>;
    setEmployeeEdits: (edits: Map<string, EmployeeEdit>) => void;
    setEditTrigger: (fn: (prev: number) => number) => void;
    availabilityMenuAnchor: Record<string, HTMLElement | null>;
    handleAvailabilityMenuOpen: (e: React.MouseEvent<HTMLElement>, employeeId: string) => void;
    handleAvailabilityMenuClose: (employeeId: string) => void;
    handleAvailabilitySelect: (employeeId: string, availability: AvailabilityType) => void;
    keptEmployees: Set<number>;
    setKeptEmployees: (fn: (prev: Set<number>) => Set<number>) => void;
    roles: string[];
    availabilities: AvailabilityType[];
    fontFamily: string;
    levelsetGreen: string;
    destructiveColor: string;
    existingEmployees?: ExistingEmployee[];
    manualMatches?: Map<string, string>;
    setManualMatches?: (fn: (prev: Map<string, string>) => Map<string, string>) => void;
  }
): GridColDef[] {
  const {
    roleMenuAnchor,
    handleRoleMenuOpen,
    handleRoleMenuClose,
    handleRoleSelect,
    employeeEdits,
    setEmployeeEdits,
    setEditTrigger,
    availabilityMenuAnchor,
    handleAvailabilityMenuOpen,
    handleAvailabilityMenuClose,
    handleAvailabilitySelect,
    keptEmployees,
    setKeptEmployees,
    roles,
    availabilities,
    fontFamily,
    levelsetGreen,
    destructiveColor,
    existingEmployees = [],
    manualMatches = new Map(),
    setManualMatches,
  } = dependencies;

  const columns: GridColDef[] = [];

  // Add "Match to Existing" column for new employees
  if (showMatchColumn && setManualMatches) {
    columns.push({
      field: 'match_existing',
      headerName: 'Match to Existing',
      width: 220,
      align: "left",
      headerAlign: "center",
      renderCell: (params) => {
        const rowKey = params.row.id;
        const matchedId = manualMatches.get(rowKey);
        const matchedEmployee = matchedId ? existingEmployees.find(e => e.id === matchedId) : null;

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%', pr: 1 }}>
            <select
              value={matchedId || ''}
              onChange={(e) => {
                const value = e.target.value;
                setManualMatches(prev => {
                  const newMatches = new Map(prev);
                  if (value) {
                    newMatches.set(rowKey, value);
                  } else {
                    newMatches.delete(rowKey);
                  }
                  return newMatches;
                });
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontFamily,
                fontSize: 12,
                borderRadius: 6,
                border: matchedEmployee ? '2px solid var(--ls-color-brand)' : '1px solid var(--ls-color-border)',
                backgroundColor: matchedEmployee ? '#f0fdf4' : '#ffffff',
                cursor: 'pointer',
              }}
            >
              <option value="">Create new...</option>
              {existingEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name || `${emp.first_name} ${emp.last_name}`}
                </option>
              ))}
            </select>
          </Box>
        );
      },
    });
  }

  columns.push({
      field: 'name',
      headerName: 'Name',
      width: 200,
      flex: 1,
      align: "left",
      headerAlign: "center",
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%' }}>
          <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 600, color: 'var(--ls-color-neutral-soft-foreground)' }}>
            {params.row.first_name} {params.row.last_name}
          </Typography>
        </Box>
      ),
    });
    columns.push({
      field: 'role',
      headerName: 'Current Role',
      width: 180,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const currentRole = params.value || 'Team Member';
        const menuAnchor = roleMenuAnchor[params.row.id] || null;
        const menuOpen = editable && Boolean(menuAnchor);
        
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
            {editable ? (
              <>
                <RolePill
                  role={currentRole}
                  endIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: "var(--ls-color-muted)" }} />}
                  onClick={(event) => handleRoleMenuOpen(event, params.row.id)}
                />
                <Menu
                  anchorEl={menuAnchor}
                  open={menuOpen}
                  onClose={() => handleRoleMenuClose(params.row.id)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  transformOrigin={{ vertical: "top", horizontal: "left" }}
                  PaperProps={{
                    sx: {
                      fontFamily,
                      borderRadius: 2,
                      boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                      border: "1px solid var(--ls-color-muted-border)",
                    },
                  }}
                >
                  {roles.map((roleOption) => (
                    <RoleMenuItem
                      key={roleOption}
                      selected={currentRole === roleOption}
                      onClick={() => handleRoleSelect(params.row.id, roleOption)}
                    >
                      <RolePill role={roleOption} />
                    </RoleMenuItem>
                  ))}
                </Menu>
              </>
            ) : (
              <RolePill role={currentRole} />
            )}
          </Box>
        );
      },
    });
    columns.push({
      field: 'is_foh',
      headerName: 'FOH',
      width: 100,
      align: "center",
      headerAlign: "center",
      type: 'boolean',
      renderCell: (params) => {
        const edit = employeeEdits.get(params.row.id);
        const checked = edit?.is_foh !== undefined ? edit.is_foh : (params.value || false);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
            <Checkbox
              checked={checked}
              disabled={!editable}
              onChange={(e) => {
                if (editable) {
                  const newEdits = new Map(employeeEdits);
                  const edit: EmployeeEdit = newEdits.get(params.row.id) || { id: params.row.id };
                  edit.is_foh = e.target.checked;
                  newEdits.set(params.row.id, edit);
                  setEmployeeEdits(newEdits);
                  setEditTrigger(prev => prev + 1);
                }
              }}
              sx={{
                color: 'var(--ls-color-disabled-text)',
                '&.Mui-checked': {
                  color: levelsetGreen,
                },
              }}
            />
          </Box>
        );
      },
    });
    columns.push({
      field: 'is_boh',
      headerName: 'BOH',
      width: 100,
      align: "center",
      headerAlign: "center",
      type: 'boolean',
      renderCell: (params) => {
        const edit = employeeEdits.get(params.row.id);
        const checked = edit?.is_boh !== undefined ? edit.is_boh : (params.value || false);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
            <Checkbox
              checked={checked}
              disabled={!editable}
              onChange={(e) => {
                if (editable) {
                  const newEdits = new Map(employeeEdits);
                  const edit: EmployeeEdit = newEdits.get(params.row.id) || { id: params.row.id };
                  edit.is_boh = e.target.checked;
                  newEdits.set(params.row.id, edit);
                  setEmployeeEdits(newEdits);
                  setEditTrigger(prev => prev + 1);
                }
              }}
              sx={{
                color: 'var(--ls-color-disabled-text)',
                '&.Mui-checked': {
                  color: levelsetGreen,
                },
              }}
            />
          </Box>
        );
      },
    });
    columns.push({
      field: 'availability',
      headerName: 'Availability',
      width: 160,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const edit = employeeEdits.get(params.row.id);
        const avail = edit?.availability || params.value || 'Available';
        const menuAnchor = availabilityMenuAnchor[params.row.id] || null;
        const menuOpen = editable && Boolean(menuAnchor);
        
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
            {editable ? (
              <>
                <AvailabilityChip
                  className={avail.toLowerCase()}
                  onClick={(event) => handleAvailabilityMenuOpen(event, params.row.id)}
                >
                  {avail}
                  <ExpandMoreIcon sx={{ fontSize: 14, ml: 0.5 }} />
                </AvailabilityChip>
                <Menu
                  anchorEl={menuAnchor}
                  open={menuOpen}
                  onClose={() => handleAvailabilityMenuClose(params.row.id)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  transformOrigin={{ vertical: "top", horizontal: "left" }}
                  PaperProps={{
                    sx: {
                      fontFamily,
                      borderRadius: 2,
                      boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                      border: "1px solid var(--ls-color-muted-border)",
                    },
                  }}
                >
                  {availabilities.map((option) => (
                    <RoleMenuItem
                      key={option}
                      selected={avail === option}
                      onClick={() => handleAvailabilitySelect(params.row.id, option)}
                    >
                      <AvailabilityChip
                        className={option.toLowerCase()}
                        sx={{ cursor: "default", transform: "none", '&:hover': { opacity: 1, transform: 'none' } }}
                      >
                        {option}
                      </AvailabilityChip>
                    </RoleMenuItem>
                  ))}
                </Menu>
              </>
            ) : (
              <AvailabilityChip className={avail.toLowerCase()}>
                {avail}
              </AvailabilityChip>
            )}
          </Box>
        );
      },
    });
    columns.push({
      field: 'hire_date',
      headerName: 'Hire Date',
      width: 120,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
          <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 500, color: 'var(--ls-color-neutral-soft-foreground)' }}>
            {params.value ? new Date(params.value).toLocaleDateString() : '-'}
          </Typography>
        </Box>
      ),
    });

  if (showKeepButton) {
    columns.push({
      field: 'actions',
      headerName: '',
      width: 100,
      renderCell: (params) => {
        const isKept = keptEmployees.has(Number(params.row.hs_id));
        return (
          <Button
            variant={isKept ? 'outlined' : 'contained'}
            onClick={() => {
              const hsId = Number(params.row.hs_id);
              if (isKept) {
                setKeptEmployees(prev => {
                  const next = new Set(prev);
                  next.delete(hsId);
                  return next;
                });
              } else {
                setKeptEmployees(prev => new Set(prev).add(hsId));
              }
            }}
            sx={{
              fontFamily,
              fontSize: 12,
              textTransform: 'none',
              backgroundColor: isKept ? 'transparent' : destructiveColor,
              color: isKept ? destructiveColor : 'white',
              borderColor: destructiveColor,
              borderRadius: '8px', // Table button - no change
              '&:hover': {
                backgroundColor: isKept ? '#fee2e2' : '#b91c1c',
              },
            }}
          >
            {isKept ? 'Kept' : 'Keep'}
          </Button>
        );
      },
    });
  }

  return columns;
}

const BookmarkletLink = styled(Link)(() => ({
  display: 'inline-block',
  background: levelsetGreen,
  color: 'white !important',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '14px',
  margin: '8px 0',
  cursor: 'move',
  '&:hover': {
    background: '#2d5a42',
    textDecoration: 'none',
  },
}));

const InstructionBox = styled(Box)(() => ({
  backgroundColor: 'var(--ls-color-neutral-foreground)',
  border: '1px solid var(--ls-color-muted-border)',
  borderRadius: '8px',
  padding: '16px',
  margin: '12px 0',
}));

const StyledDialog = styled(Dialog)(() => ({
  '& .MuiDialog-paper': {
    maxWidth: '1200px !important',
    width: '100%',
    borderRadius: '16px',
    maxHeight: '90vh',
    fontFamily,
  },
}));

const StickyHeader = styled(Box)(() => ({
  position: 'sticky',
  top: 0,
  zIndex: 10,
  backgroundColor: 'var(--ls-color-bg-container)',
  borderBottom: '1px solid #e9eaeb',
  padding: '24px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const ScrollableContent = styled(Box)(() => ({
  overflowY: 'auto',
  flex: 1,
  padding: '24px',
}));

export function SyncEmployeesModal({
  open,
  onClose,
  locationId,
  orgId,
  className = "",
  onSyncComplete,
  scheduleImportMode = false,
  defaultScheduleSync = false,
}: SyncEmployeesModalProps) {
  const [currentPage, setCurrentPage] = React.useState<Page>('instructions');
  const [exitConfirmOpen, setExitConfirmOpen] = React.useState(false);
  const [notification, setNotification] = React.useState<SyncNotification | null>(null);
  const [hasSyncedBefore, setHasSyncedBefore] = React.useState(false);
  const [employeeEdits, setEmployeeEdits] = React.useState<Map<string, EmployeeEdit>>(new Map());
  const [keptEmployees, setKeptEmployees] = React.useState<Set<number>>(new Set());

  // Termination reason state
  const [terminationReasons, setTerminationReasons] = React.useState<Array<{ id: string; reason: string; category: string }>>([]);
  const [terminationReasonSelections, setTerminationReasonSelections] = React.useState<Map<number, string>>(new Map());

  const [confirming, setConfirming] = React.useState(false);
  const [editTrigger, setEditTrigger] = React.useState(0); // Force re-render when edits change
  const [confirmationStats, setConfirmationStats] = React.useState<{
    created: number;
    updated: number;
    deactivated: number;
  } | null>(null);

  // Track when modal opened to only accept notifications created after this time
  const [modalOpenTime, setModalOpenTime] = React.useState<Date | null>(null);

  // State for existing employees and manual match selections
  const [existingEmployees, setExistingEmployees] = React.useState<ExistingEmployee[]>([]);
  const [manualMatches, setManualMatches] = React.useState<Map<string, string>>(new Map()); // newEmpKey -> existingEmpId

  // Scheduling sync state
  const [scheduleToggle, setScheduleToggle] = React.useState(defaultScheduleSync);
  const [positionMappings, setPositionMappings] = React.useState<Map<number, string | null>>(new Map());
  const [orgPositions, setOrgPositions] = React.useState<Array<{ id: string; name: string; zone: string }>>([]);
  const [scheduleStats, setScheduleStats] = React.useState<{
    shifts_created: number;
    assignments_created: number;
    total_hours: number;
    total_cost: number;
  } | null>(null);
  const [scheduleSyncing, setScheduleSyncing] = React.useState(false);
  // Check org's actual scheduling feature — query directly so admin bypass doesn't
  // show scheduling config for orgs that don't have the feature enabled.
  const [hasSchedulingFeature, setHasSchedulingFeature] = React.useState(false);
  React.useEffect(() => {
    if (!orgId) return;
    const supabase = createSupabaseClient();
    supabase.from('org_features').select('enabled')
      .eq('org_id', orgId).eq('feature_key', 'scheduling').maybeSingle()
      .then(({ data }) => setHasSchedulingFeature(data?.enabled === true));
  }, [orgId]);

  // Fetch termination reasons for this org
  React.useEffect(() => {
    if (!orgId) return;
    const supabase = createSupabaseClient();
    supabase.from('termination_reasons')
      .select('id, reason, category, display_order')
      .eq('org_id', orgId)
      .eq('active', true)
      .order('display_order', { ascending: true })
      .then(({ data }) => setTerminationReasons(data || []));
  }, [orgId]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const bookmarkletCode = React.useMemo(() => {
    if (!baseUrl) return '';

    // Bookmarklet phases:
    // 1. Parse HS cookie to extract location number + HS client ID
    // 2. Bootstrap — fetch schedule config to get weekStartDate, jobs, roles
    // 3. Parallel fetch — employees + shifts + jobs + roles + forecasts + time-off + availability
    // 4. POST all data to sync-hotschedules endpoint (no embedded Levelset IDs)
    const code = `javascript:(function(){
var baseUrl='${baseUrl}';
var loadingDiv=document.createElement('div');
loadingDiv.style.cssText='position:fixed;top:20px;right:20px;background:#31664a;color:white;padding:15px 20px;border-radius:8px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui,sans-serif;min-width:260px;';
loadingDiv.textContent='Connecting to HotSchedules...';
document.body.appendChild(loadingDiv);
var hsClientId=null;var hsLocationNumber=null;var hsLocationDisplay=null;
try{var cookieMatch=document.cookie.match(/clarifi_previous_node_store_selection=([^;]+)/);if(cookieMatch){var decoded=decodeURIComponent(cookieMatch[1]);var parsed=JSON.parse(decoded);var keys=Object.keys(parsed);if(keys.length>0){var entry=parsed[keys[0]];hsLocationDisplay=entry.display||'';var numMatch=hsLocationDisplay.match(/\\((\\d{5})\\)/);if(numMatch)hsLocationNumber=numMatch[1];var idMatch=entry.name?entry.name.match(/:clarifi:(\\d+):/):null;if(idMatch)hsClientId=parseInt(idMatch[1],10);}}}catch(e){console.warn('Could not parse HS cookie:',e);}
var hsOrigin=window.location.origin;
var ts=Date.now();
var fetchOpts={method:'GET',credentials:'include',headers:{'Accept':'application/json'}};
function hsFetch(path){return fetch(hsOrigin+path+(path.indexOf('?')>-1?'&':'?')+'_='+ts,fetchOpts).then(function(r){if(!r.ok)throw new Error('HS API error '+r.status+' on '+path);return r.json();});}
function safeFetch(path){return hsFetch(path).catch(function(){return [];});}
loadingDiv.textContent='Fetching schedule configuration...';
hsFetch('/hs/spring/scheduling/bootstrap').then(function(bootstrap){
var weekStart=bootstrap.currentWeekStartDate||'';
var prevWeek=new Date(weekStart);prevWeek.setDate(prevWeek.getDate()-7);
var nextWeek=new Date(weekStart);nextWeek.setDate(nextWeek.getDate()+14);
var rangeStart=prevWeek.toISOString().split('T')[0];
var rangeEnd=nextWeek.toISOString().split('T')[0];
var weekEnd=new Date(weekStart);weekEnd.setDate(weekEnd.getDate()+6);
var weekEndStr=weekEnd.toISOString().split('T')[0];
loadingDiv.textContent='Fetching employees, shifts, and forecasts...';
return Promise.all([
hsFetch('/hs/spring/client/employee/?active=true'),
safeFetch('/hs/spring/scheduling/shift/?start='+rangeStart+'&end='+rangeEnd),
safeFetch('/hs/spring/client/jobs/'),
safeFetch('/hs/spring/client/roles/'),
safeFetch('/hs/spring/forecast/forecast-summary/'+weekStart),
safeFetch('/hs/spring/forecast/sls-projected-total/?weekStartDate='+weekStart),
safeFetch('/hs/rest-session/timeoff/range/?start='+weekStart+'T00:00:00&end='+weekEndStr+'T23:59:59'),
safeFetch('/hs/rest-session/timeoff/range/status/?start='+weekStart+'T00:00:00&end='+weekEndStr+'T23:59:59'),
safeFetch('/hs/rest-session/availability-calendar/?minStatus=0&start='+weekStart+'T00:00:00&end='+weekEndStr+'T23:59:59'),
safeFetch('/hs/spring/forecast/lp-forecast/?date='+weekStart)
]).then(function(results){
var allEmployees=results[0];
if(!Array.isArray(allEmployees)||allEmployees.length===0)throw new Error('No employee data received from HotSchedules API');
var visibleEmployees=allEmployees.filter(function(emp){return emp.visible===true;});
if(visibleEmployees.length===0)throw new Error('No visible employees found in the data');
var shifts=Array.isArray(results[1])?results[1]:[];
var jobs=Array.isArray(results[2])?results[2]:[];
var roles=Array.isArray(results[3])?results[3]:[];
var forecastSummary=results[4];
var slsProjected=results[5];
var timeOff=Array.isArray(results[6])?results[6]:[];
var timeOffStatuses=Array.isArray(results[7])?results[7]:[];
var availability=Array.isArray(results[8])?results[8]:[];
var lpForecast=results[9];
var forecastId=null;
if(Array.isArray(lpForecast)&&lpForecast.length>0&&lpForecast[0].forecastId){forecastId=lpForecast[0].forecastId;}
loadingDiv.textContent='Fetching forecast intervals...';
return (forecastId?safeFetch('/hs/spring/forecast/lp-store-volume-data/?forecastId='+forecastId):Promise.resolve([])).then(function(intervals){
var forecastIntervals=Array.isArray(intervals)?intervals:[];
var payload={employees:visibleEmployees,shifts:shifts,jobs:jobs,roles:roles,bootstrap:{id:bootstrap.id,currentWeekStartDate:bootstrap.currentWeekStartDate,utcOffset:bootstrap.utcOffset,tz:bootstrap.tz,scheduleMinuteInterval:bootstrap.scheduleMinuteInterval,clientWorkWeekStart:bootstrap.clientWorkWeekStart,userJobs:bootstrap.userJobs||[],jobs:bootstrap.jobs||[],schedules:bootstrap.schedules||[]},forecasts:{daily:forecastSummary&&forecastSummary.projectedVolume?forecastSummary.projectedVolume:[],intervals:forecastIntervals,benchmarks:[]},slsProjected:Array.isArray(slsProjected)?slsProjected:[],timeOff:timeOff,timeOffStatuses:timeOffStatuses,availability:availability,weekStartDate:weekStart,hs_client_id:hsClientId||bootstrap.id,hs_location_number:hsLocationNumber,hs_location_display:hsLocationDisplay};
loadingDiv.textContent='Syncing to Levelset...';
return fetch(baseUrl+'/api/employees/sync-hotschedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
});
});
}).then(function(r){if(!r.ok){return r.json().then(function(data){throw new Error(data.error||'Sync failed');});}return r.json();}).then(function(data){loadingDiv.remove();var resultDiv=document.createElement('div');resultDiv.style.cssText='position:fixed;top:20px;right:20px;background:'+(data.success?'#10b981':'#ef4444')+';color:white;padding:20px;border-radius:8px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui,sans-serif;max-width:400px;';if(data.success){var msg='<strong>Sync Successful!</strong><br><br>Employees: '+data.stats.new+' new, '+data.stats.modified+' updated, '+data.stats.terminated+' terminated';if(data.stats.shifts_received){msg+='<br>Shifts: '+data.stats.shifts_received+' captured';}if(data.stats.jobs_received){msg+='<br>Jobs: '+data.stats.jobs_received;}resultDiv.innerHTML=msg;}else{resultDiv.innerHTML='<strong>Sync Failed</strong><br><br>'+data.error+(data.details?'<br><br>Details: '+data.details:'');}document.body.appendChild(resultDiv);setTimeout(function(){resultDiv.remove();},8000);}).catch(function(err){loadingDiv.remove();var errorDiv=document.createElement('div');errorDiv.style.cssText='position:fixed;top:20px;right:20px;background:#ef4444;color:white;padding:20px;border-radius:8px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui,sans-serif;max-width:400px;';errorDiv.innerHTML='<strong>Error</strong><br><br>'+err.message;document.body.appendChild(errorDiv);setTimeout(function(){errorDiv.remove();},8000);});
})();`;

    return code;
  }, [baseUrl]);

  // Fetch has_synced_before flag
  React.useEffect(() => {
    if (!locationId || !open) return;
    
    const fetchLocationData = async () => {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from('locations')
        .select('has_synced_before')
        .eq('id', locationId)
        .single();
      
      if (data) {
        setHasSyncedBefore(data.has_synced_before || false);
      }
    };
    
    fetchLocationData();
  }, [locationId, open]);

  // Track when modal opens
  React.useEffect(() => {
    if (open && !modalOpenTime) {
      setModalOpenTime(new Date());
    } else if (!open && modalOpenTime) {
      setModalOpenTime(null);
    }
  }, [open, modalOpenTime]);

  // Poll for sync notifications on Page 1
  // Only accept notifications created AFTER the modal opened
  React.useEffect(() => {
    if (currentPage !== 'instructions' || !locationId || !open || !modalOpenTime) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/employees/sync-notification?location_id=${locationId}`);
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.notification) {
          // Only accept notifications created after modal opened
          const notificationTime = new Date(data.notification.created_at);
          if (notificationTime > modalOpenTime) {
            setNotification(data.notification);
            // Go to config page if scheduling data is present and org has scheduling feature
            if (data.notification.sync_data?.has_scheduling_data && hasSchedulingFeature) {
              setCurrentPage('config');
            } else {
              setCurrentPage('review');
            }
          } else {
            // Ignore notifications created before modal opened
          }
        }
      } catch (error) {
        console.error('Error polling for notifications:', error);
      }
    }, 2500); // Poll every 2.5 seconds

    return () => clearInterval(pollInterval);
  }, [currentPage, locationId, open, modalOpenTime, hasSchedulingFeature]);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setCurrentPage('instructions');
      setNotification(null);
      setEmployeeEdits(new Map());
      setKeptEmployees(new Set());
      setConfirmationStats(null);
      setExitConfirmOpen(false);
      setModalOpenTime(null);
      setExistingEmployees([]);
      setManualMatches(new Map());
      setScheduleToggle(defaultScheduleSync);
      setPositionMappings(new Map());
      setOrgPositions([]);
      setScheduleStats(null);
      setScheduleSyncing(false);
      setTerminationReasonSelections(new Map());
    }
  }, [open]);

  // Schedule Import Mode: load latest notification and jump to position_mapping
  React.useEffect(() => {
    if (!open || !scheduleImportMode || !locationId || !orgId) return;
    // Skip if already loaded
    if (notification && currentPage !== 'instructions') return;

    const loadNotification = async () => {
      try {
        const res = await fetch(`/api/employees/sync-notification?location_id=${locationId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.notification?.sync_data?.has_scheduling_data && data.notification?.sync_data?.scheduling) {
          setNotification(data.notification);
          setScheduleToggle(true);
          setCurrentPage('position_mapping');
        }
      } catch (err) {
        console.error('[SyncEmployeesModal] Failed to load notification for schedule import:', err);
      }
    };

    loadNotification();
  }, [open, scheduleImportMode, locationId, orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch existing employees when we receive a notification
  React.useEffect(() => {
    if (!notification || !locationId) return;

    const fetchExistingEmployees = async () => {
      try {
        const supabase = createSupabaseClient();
        const { data, error } = await supabase
          .from('employees')
          .select('id, first_name, last_name, full_name, email, role')
          .eq('location_id', locationId)
          .eq('active', true)
          .order('full_name');

        if (error) {
          console.error('Error fetching existing employees:', error);
          return;
        }

        setExistingEmployees(data || []);
      } catch (err) {
        console.error('Error fetching existing employees:', err);
      }
    };

    fetchExistingEmployees();
  }, [notification, locationId]);

  const handleClose = () => {
    if (currentPage === 'instructions' || currentPage === 'confirmation') {
      onClose();
    } else {
      setExitConfirmOpen(true);
    }
  };

  const handleExitAnyway = () => {
    setExitConfirmOpen(false);
    onClose();
  };

  // Check if all non-kept terminated employees have a termination reason selected
  const allTerminatedHaveReasons = React.useMemo(() => {
    if (!notification || currentPage !== 'review') return true;
    const terminated = notification.sync_data.terminated_employees || [];
    for (const emp of terminated) {
      const hsId = Number(emp.hs_id);
      if (keptEmployees.has(hsId)) continue;
      if (!terminationReasonSelections.get(hsId)) return false;
    }
    return true;
  }, [notification, currentPage, keptEmployees, terminationReasonSelections]);

  const handleConfirmSync = async () => {
    if (!notification) return;

    setConfirming(true);
    try {
      // For new employees, use email or hs_id as key (they don't have IDs yet)
      const newEmployeesUpdates = (notification.sync_data.new_employees || []).map(emp => {
        const key = emp.email || `hs_${emp.hs_id}`;
        const edit = employeeEdits.get(key);
        const matchedExistingId = manualMatches.get(key);
        return {
          email: emp.email,
          hs_id: emp.hs_id,
          role: edit?.role,
          is_foh: edit?.is_foh,
          is_boh: edit?.is_boh,
          availability: edit?.availability,
          match_existing_id: matchedExistingId || null, // ID of existing employee to merge with
        };
      });

      // Build termination reasons map (hs_id -> reason string)
      const terminationReasonsMap: Record<number, string> = {};
      terminationReasonSelections.forEach((reason, hsId) => {
        if (reason) terminationReasonsMap[hsId] = reason;
      });

      const response = await fetch('/api/employees/confirm-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: notification.id,
          new_employees: newEmployeesUpdates,
          kept_employees: Array.from(keptEmployees),
          termination_reasons: terminationReasonsMap,
        }),
      });

      if (!response.ok) throw new Error('Failed to confirm sync');

      const data = await response.json();
      setConfirmationStats(data.stats);

      // Route to next step based on schedule toggle
      if (scheduleToggle && notification.sync_data?.scheduling) {
        const unmapped = notification.sync_data.scheduling.unmapped_jobs || [];
        if (unmapped.length > 0) {
          setCurrentPage('position_mapping');
        } else {
          setCurrentPage('schedule_review');
        }
      } else {
        setCurrentPage('confirmation');
      }
    } catch (error) {
      console.error('Error confirming sync:', error);
      alert('Failed to confirm sync. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const handleBackToRoster = () => {
    onClose();
    if (onSyncComplete) {
      onSyncComplete();
    }
  };

  // Render Page 1: Instructions
  const renderInstructionsPage = () => (
    <Box>
      <Stepper 
        orientation="vertical"
        sx={{
          '& .MuiStepIcon-root': {
            color: 'var(--ls-color-border)',
            fontSize: '28px',
            '&.Mui-active': {
              color: levelsetGreen,
            },
            '&.Mui-completed': {
              color: levelsetGreen,
            },
          },
          '& .MuiStepIcon-text': {
            fill: 'white',
            fontSize: '16px',
            fontWeight: 600,
          },
        }}
      >
        <Step active={true} completed={false}>
          <StepLabel
            sx={{
              '& .MuiStepLabel-label': {
                fontFamily,
                fontWeight: 600,
                fontSize: '16px',
              },
            }}
          >
            Login to HotSchedules
          </StepLabel>
          <StepContent>
            <Box sx={{ mt: 1, mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontFamily }}>
                First, make sure you're logged into HotSchedules. Click the button below to open HotSchedules in a new tab.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<LaunchIcon />}
                href="https://app.hotschedules.com/hs/login.jsp"
                target="_blank"
                sx={{
                  fontFamily,
                  fontSize: 14,
                  fontWeight: 500,
                  textTransform: "none",
                  borderColor: levelsetGreen,
                  color: levelsetGreen,
                  borderRadius: '8px', // 4px default + 4px = 8px
                  "&:hover": {
                    borderColor: "#2d5a42",
                    backgroundColor: "#f0f9f4",
                  },
                }}
              >
                Open HotSchedules
              </Button>
            </Box>
          </StepContent>
        </Step>

        <Step active={true} completed={false}>
          <StepLabel
            sx={{
              '& .MuiStepLabel-label': {
                fontFamily,
                fontWeight: 600,
                fontSize: '16px',
              },
            }}
          >
            Install the Bookmarklet
          </StepLabel>
          <StepContent>
            <Box sx={{ mt: 1, mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 2, fontFamily }}>
                Drag the bookmarklet link below to your browser's bookmarks bar:
              </Typography>
              <InstructionBox>
                <Typography variant="body2" sx={{ fontFamily, mb: 0.5, fontWeight: 600 }}>
                  💡 Tip: If you don't see your bookmarks bar, press:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily, mb: 0.5, ml: 2 }}>
                  <code>Ctrl+Shift+B</code> (Windows)
                </Typography>
                <Typography variant="body2" sx={{ fontFamily, ml: 2 }}>
                  <code>Cmd+Shift+B</code> (Mac)
                </Typography>
              </InstructionBox>
              <Box sx={{ textAlign: 'center', my: 2 }}>
                <BookmarkletLink
                  href={bookmarkletCode}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', bookmarkletCode);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                >
                  Levelset HS Sync
                </BookmarkletLink>
                <Typography variant="body2" sx={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)', mt: 1, textAlign: 'center' }}>
                  Drag this link to your bookmarks bar
                </Typography>
              </Box>
            </Box>
          </StepContent>
        </Step>

        <Step active={true} completed={false}>
          <StepLabel
            sx={{
              '& .MuiStepLabel-label': {
                fontFamily,
                fontWeight: 600,
                fontSize: '16px',
              },
            }}
          >
            Run the Sync
          </StepLabel>
          <StepContent>
            <Box sx={{ mt: 1, mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontFamily }}>
                Once you've logged in to HotSchedules:
              </Typography>
              <ol style={{ fontFamily, paddingLeft: '20px', marginTop: '8px' }}>
                <li style={{ marginBottom: '8px' }}>
                  <Typography variant="body2" component="span" sx={{ fontFamily }}>
                    Navigate to the <strong>Scheduling page</strong> in HotSchedules
                  </Typography>
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <Typography variant="body2" component="span" sx={{ fontFamily }}>
                    Click the bookmark you just added to your bookmarks bar
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" component="span" sx={{ fontFamily }}>
                    The bookmarklet will automatically capture employee and scheduling data and sync it to Levelset
                  </Typography>
                </li>
              </ol>
            </Box>
          </StepContent>
        </Step>
      </Stepper>
    </Box>
  );

  // Menu state for role and availability dropdowns
  const [roleMenuAnchor, setRoleMenuAnchor] = React.useState<{ [key: string]: HTMLElement | null }>({});
  const [availabilityMenuAnchor, setAvailabilityMenuAnchor] = React.useState<{ [key: string]: HTMLElement | null }>({});

  const roles: string[] = ['New Hire', 'Team Member', 'Trainer', 'Team Lead', 'Director', 'Executive', 'Operator'];
  const availabilities: AvailabilityType[] = ['Available', 'Limited'];

  // Memoize handlers to prevent column recreation on every render
  const handleRoleMenuOpen = React.useCallback((event: React.MouseEvent<HTMLElement>, employeeId: string) => {
    setRoleMenuAnchor(prev => ({ ...prev, [employeeId]: event.currentTarget }));
  }, []);

  const handleRoleMenuClose = React.useCallback((employeeId: string) => {
    setRoleMenuAnchor(prev => ({ ...prev, [employeeId]: null }));
  }, []);

  const handleRoleSelect = React.useCallback((employeeId: string, role: string) => {
    handleRoleMenuClose(employeeId);
    setEmployeeEdits(prev => {
      const newEdits = new Map(prev);
      const edit: EmployeeEdit = newEdits.get(employeeId) || { id: employeeId };
      edit.role = role;
      newEdits.set(employeeId, edit);
      return newEdits;
    });
    setEditTrigger(prev => prev + 1);
  }, [handleRoleMenuClose]);

  const handleAvailabilityMenuOpen = React.useCallback((event: React.MouseEvent<HTMLElement>, employeeId: string) => {
    setAvailabilityMenuAnchor(prev => ({ ...prev, [employeeId]: event.currentTarget }));
  }, []);

  const handleAvailabilityMenuClose = React.useCallback((employeeId: string) => {
    setAvailabilityMenuAnchor(prev => ({ ...prev, [employeeId]: null }));
  }, []);

  const handleAvailabilitySelect = React.useCallback((employeeId: string, availability: AvailabilityType) => {
    handleAvailabilityMenuClose(employeeId);
    setEmployeeEdits(prev => {
      const newEdits = new Map(prev);
      const edit: EmployeeEdit = newEdits.get(employeeId) || { id: employeeId };
      edit.availability = availability;
      newEdits.set(employeeId, edit);
      return newEdits;
    });
    setEditTrigger(prev => prev + 1);
  }, [handleAvailabilityMenuClose]);


  // CRITICAL: Always create columns unconditionally to ensure consistent hook count
  // The column structure (including Menu components in renderCell) must always be defined
  // DataGridPro will only render them when needed, but the structure is always consistent
  // This prevents React from seeing different hook counts when shouldCreateColumns changes
  const editableColumns = React.useMemo<GridColDef[]>(() => {
    return createEmployeeColumns(true, false, true, {
      roleMenuAnchor,
      handleRoleMenuOpen,
      handleRoleMenuClose,
      handleRoleSelect,
      employeeEdits,
      setEmployeeEdits,
      setEditTrigger,
      availabilityMenuAnchor,
      handleAvailabilityMenuOpen,
      handleAvailabilityMenuClose,
      handleAvailabilitySelect,
      keptEmployees,
      setKeptEmployees,
      roles,
      availabilities,
      fontFamily,
      levelsetGreen,
      destructiveColor,
      existingEmployees,
      manualMatches,
      setManualMatches,
    });
  }, [
    editTrigger,
    employeeEdits,
    roleMenuAnchor,
    availabilityMenuAnchor,
    keptEmployees,
    handleRoleMenuOpen,
    handleRoleMenuClose,
    handleRoleSelect,
    setEmployeeEdits,
    setEditTrigger,
    handleAvailabilityMenuOpen,
    handleAvailabilityMenuClose,
    handleAvailabilitySelect,
    setKeptEmployees,
    existingEmployees,
    manualMatches,
  ]);

  const readOnlyColumns = React.useMemo<GridColDef[]>(() => {
    return createEmployeeColumns(false, true, false, {
      roleMenuAnchor,
      handleRoleMenuOpen,
      handleRoleMenuClose,
      handleRoleSelect,
      employeeEdits,
      setEmployeeEdits,
      setEditTrigger,
      availabilityMenuAnchor,
      handleAvailabilityMenuOpen,
      handleAvailabilityMenuClose,
      handleAvailabilitySelect,
      keptEmployees,
      setKeptEmployees,
      roles,
      availabilities,
      fontFamily,
      levelsetGreen,
      destructiveColor,
    });
  }, [
    keptEmployees,
    employeeEdits,
    roleMenuAnchor,
    availabilityMenuAnchor,
    handleRoleMenuOpen,
    handleRoleMenuClose,
    handleRoleSelect,
    setEmployeeEdits,
    setEditTrigger,
    handleAvailabilityMenuOpen,
    handleAvailabilityMenuClose,
    handleAvailabilitySelect,
    setKeptEmployees,
  ]);

  // Columns for terminated employees DataGrid — extends readOnlyColumns with a termination reason selector
  const terminatedColumnsWithReason = React.useMemo<GridColDef[]>(() => {
    // Insert the reason column before the last column (the "Keep" button)
    const cols = [...readOnlyColumns];
    const reasonColumn: GridColDef = {
      field: 'termination_reason',
      headerName: 'Reason',
      width: 220,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const hsId = Number(params.row.hs_id);
        const isKept = keptEmployees.has(hsId);
        if (isKept) return null;
        const selected = terminationReasonSelections.get(hsId) || '';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={selected}
                displayEmpty
                onChange={(e) => {
                  setTerminationReasonSelections(prev => {
                    const next = new Map(prev);
                    next.set(hsId, e.target.value as string);
                    return next;
                  });
                }}
                sx={{
                  fontFamily,
                  fontSize: 12,
                  height: 32,
                  backgroundColor: selected ? '#fff' : '#fff5f5',
                  '& .MuiSelect-select': {
                    padding: '4px 8px',
                  },
                }}
              >
                <MenuItem value="" disabled>
                  <em style={{ fontSize: 12 }}>Select reason</em>
                </MenuItem>
                {terminationReasons.map(r => (
                  <MenuItem key={r.id} value={r.reason} sx={{ fontFamily, fontSize: 12 }}>
                    {r.reason}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        );
      },
    };
    // Insert before the last column (Keep button)
    cols.splice(cols.length - 1, 0, reasonColumn);
    return cols;
  }, [readOnlyColumns, keptEmployees, terminationReasonSelections, terminationReasons]);

  // CRITICAL: Move useMemo hooks out of renderReviewPage to component body
  // This ensures hooks are always called in the same order, preventing hook order violations
  const syncData = notification?.sync_data;
  const newEmployees = syncData?.new_employees || [];
  const modifiedEmployees = syncData?.modified_employees || [];
  const terminatedEmployees = syncData?.terminated_employees || [];

  // Prepare new employees data with default role - reactive to edits
  // Always call useMemo, return empty array when not on review page
  const newEmployeesData = React.useMemo(() => {
    if (!notification || currentPage !== 'review') {
      return [];
    }
    return newEmployees.map(emp => {
      // Use email or hs_id as key for new employees (they don't have IDs yet)
      const key = emp.email || `hs_${emp.hs_id}`;
      const edit = employeeEdits.get(key);
      return {
        id: key, // Use key as id for DataGrid
        email: emp.email,
        hs_id: emp.hs_id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        role: edit?.role || (hasSyncedBefore ? 'New Hire' : 'Team Member'),
        is_foh: edit?.is_foh !== undefined ? edit.is_foh : false,
        is_boh: edit?.is_boh !== undefined ? edit.is_boh : false,
        availability: edit?.availability || ('Available' as AvailabilityType),
        hire_date: emp.hire_date,
      };
    }).sort((a, b) => {
      // Sort by first name (case-insensitive)
      const firstNameA = (a.first_name || '').toLowerCase();
      const firstNameB = (b.first_name || '').toLowerCase();
      return firstNameA.localeCompare(firstNameB);
    });
  }, [notification, currentPage, newEmployees, employeeEdits, hasSyncedBefore, editTrigger]);

  // Prepare terminated employees data
  // Always call useMemo, return empty array when not on review page
  const terminatedEmployeesData = React.useMemo(() => {
    if (!notification || currentPage !== 'review') {
      return [];
    }
    return terminatedEmployees.map(emp => ({
      id: emp.id,
      first_name: emp.first_name,
      last_name: emp.last_name,
      role: 'Team Member', // Default, not editable
      is_foh: false,
      is_boh: false,
      availability: 'Available' as AvailabilityType,
      hire_date: null,
      hs_id: emp.hs_id,
    })).sort((a, b) => {
      // Sort by first name (case-insensitive)
      const firstNameA = (a.first_name || '').toLowerCase();
      const firstNameB = (b.first_name || '').toLowerCase();
      return firstNameA.localeCompare(firstNameB);
    });
  }, [notification, currentPage, terminatedEmployees]);

  // Count terminated employees (excluding kept ones) - always calculate
  const terminatedCount = React.useMemo(() => {
    if (!notification || currentPage !== 'review') return 0;
    return terminatedEmployeesData.filter(emp => !keptEmployees.has(Number(emp.hs_id))).length;
  }, [notification, currentPage, terminatedEmployeesData, keptEmployees]);

  // Render Page 2: Review Changes
  const renderReviewPage = () => {
    if (!notification) return null;

    const hasChanges = newEmployees.length > 0 || modifiedEmployees.length > 0 || terminatedEmployees.length > 0;

    if (!hasChanges) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ fontFamily, fontSize: 18, fontWeight: 600, color: 'var(--ls-color-neutral-soft-foreground)', mb: 2 }}>
            Your roster is up to date
          </Typography>
          <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-muted)' }}>
            No changes were made.
          </Typography>
        </Box>
      );
    }

    // Count terminated employees (excluding kept ones) - moved outside renderReviewPage

    return (
      <Box>
        {/* New Employees Accordion */}
        <Accordion
          defaultExpanded={newEmployees.length > 0}
          disabled={newEmployees.length === 0}
          disableGutters
          elevation={0}
          sx={{
            '&:before': { display: 'none' },
            '&.MuiAccordion-root': {
              backgroundColor: 'transparent',
              boxShadow: 'none',
              border: 'none',
              borderRadius: '8px',
              mb: 2,
            },
            '&.Mui-disabled': {
              backgroundColor: 'var(--ls-color-neutral-foreground)',
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: levelsetGreen }} />}
            sx={{
              padding: '12px 16px',
              minHeight: 48,
              '&.Mui-expanded': {
                minHeight: 48,
              },
              '& .MuiAccordionSummary-content': {
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              },
            }}
          >
            <Typography sx={{ fontFamily, fontSize: 18, fontWeight: 600, color: levelsetGreen }}>
              New Employees
            </Typography>
            <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-muted)', ml: 1 }}>
              {newEmployees.length > 0 ? `${newEmployees.length} employees` : 'No employees'}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ padding: 0, overflow: 'visible' }}>
            {newEmployees.length > 0 && currentPage === 'review' && notification !== null && (
              <Box sx={{ p: 2, overflow: 'visible' }}>
                <Box sx={{ 
                  height: 400, 
                  width: '100%',
                  borderRadius: '16px',
                  border: "1px solid var(--ls-color-muted-border)",
                  backgroundColor: "var(--ls-color-bg-container)",
                  overflow: "hidden",
                  boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.04)",
                }}>
                  <DataGridPro
                    rows={newEmployeesData}
                    columns={editableColumns}
                    disableRowSelectionOnClick
                    hideFooter
                    rowHeight={48}
                    columnHeaderHeight={56}
                    sx={{
                      fontFamily,
                      border: "none",
                      borderRadius: '16px',
                      overflow: 'hidden',
                      '& .MuiDataGrid-cell': {
                        borderBottom: '1px solid var(--ls-color-muted-soft)',
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--ls-color-neutral-soft-foreground)',
                        cursor: 'default',
                        '&:focus': {
                          outline: 'none',
                        },
                        '&:focus-within': {
                          outline: 'none',
                        },
                      },
                      '& .MuiDataGrid-cell:focus': {
                        outline: 'none',
                      },
                      '& .MuiDataGrid-row': {
                        cursor: 'default',
                        '&:hover': {
                          backgroundColor: 'transparent',
                        },
                      },
                      '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: 'var(--ls-color-neutral-foreground)',
                        borderBottom: '2px solid var(--ls-color-muted-border)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--ls-color-neutral-soft-foreground)',
                      },
                      '& .MuiDataGrid-columnHeaderTitleContainer': {
                        padding: '0 16px',
                      },
                    }}
                  />
                </Box>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Modified Employees Accordion */}
        <Accordion
          disabled={true}
          disableGutters
          elevation={0}
          sx={{
            '&:before': { display: 'none' },
            '&.MuiAccordion-root': {
              backgroundColor: 'transparent',
              boxShadow: 'none',
              border: 'none',
              borderRadius: '8px',
              mb: 2,
            },
            '&.Mui-disabled': {
              backgroundColor: 'var(--ls-color-neutral-foreground)',
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: warningColor }} />}
            sx={{
              padding: '12px 16px',
              minHeight: 48,
              '&.Mui-expanded': {
                minHeight: 48,
              },
              '& .MuiAccordionSummary-content': {
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              },
            }}
          >
            <Typography sx={{ fontFamily, fontSize: 18, fontWeight: 600, color: warningColor }}>
              Modified Employees
            </Typography>
            <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-muted)', ml: 1 }}>
              No employees
            </Typography>
          </AccordionSummary>
        </Accordion>

        {/* Terminated Employees Accordion */}
        <Accordion
          defaultExpanded={terminatedCount > 0}
          disabled={terminatedCount === 0}
          disableGutters
          elevation={0}
          sx={{
            '&:before': { display: 'none' },
            '&.MuiAccordion-root': {
              backgroundColor: 'transparent',
              boxShadow: 'none',
              border: 'none',
              borderRadius: '8px',
              mb: 2,
            },
            '&.Mui-disabled': {
              backgroundColor: 'var(--ls-color-neutral-foreground)',
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: destructiveColor }} />}
            sx={{
              padding: '12px 16px',
              minHeight: 48,
              '&.Mui-expanded': {
                minHeight: 48,
              },
              '& .MuiAccordionSummary-content': {
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              },
            }}
          >
            <Typography sx={{ fontFamily, fontSize: 18, fontWeight: 600, color: destructiveColor }}>
              Terminated Employees
            </Typography>
            <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-muted)', ml: 1 }}>
              {terminatedCount > 0 ? `${terminatedCount} employees` : 'No employees'}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ padding: 0, overflow: 'visible' }}>
            {terminatedEmployeesData.length > 0 && currentPage === 'review' && notification !== null && (
              <Box sx={{ p: 2, overflow: 'visible' }}>
                <Box sx={{ 
                  height: 400, 
                  width: '100%',
                  borderRadius: '16px',
                  border: "1px solid var(--ls-color-muted-border)",
                  backgroundColor: "var(--ls-color-bg-container)",
                  overflow: "hidden",
                  boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.04)",
                }}>
                  <DataGridPro
                    rows={terminatedEmployeesData}
                    columns={terminatedColumnsWithReason}
                    disableRowSelectionOnClick
                    hideFooter
                    rowHeight={48}
                    columnHeaderHeight={56}
                    getRowClassName={(params) =>
                      keptEmployees.has(Number(params.row.hs_id)) ? '' : 'terminated-row'
                    }
                    sx={{
                      fontFamily,
                      border: "none",
                      borderRadius: '16px',
                      overflow: 'hidden',
                      '& .MuiDataGrid-cell': {
                        borderBottom: '1px solid var(--ls-color-muted-soft)',
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--ls-color-neutral-soft-foreground)',
                      },
                      '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: 'var(--ls-color-neutral-foreground)',
                        borderBottom: '2px solid var(--ls-color-muted-border)',
                      },
                      '& .terminated-row': {
                        backgroundColor: '#fee2e2 !important',
                        '& .MuiDataGrid-cell': {
                          backgroundColor: '#fee2e2 !important',
                        },
                      },
                    }}
                    key={keptEmployees.size} // Force re-render when kept employees change
                  />
                </Box>
                {keptEmployees.size > 0 && (
                  <Box sx={{ mt: 2, p: 2, backgroundColor: 'var(--ls-color-neutral-foreground)', borderRadius: '8px' }}>
                    {Array.from(keptEmployees).map(hsId => {
                      const emp = terminatedEmployeesData.find(e => Number(e.hs_id) === hsId);
                      if (!emp) return null;
                      return (
                        <Typography key={hsId} sx={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)', mb: 1 }}>
                          {emp.first_name} {emp.last_name} will be kept on your Levelset roster. This has no impact on their status in HotSchedules or HR/Payroll.
                        </Typography>
                      );
                    })}
                  </Box>
                )}
              </Box>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Confirm Button */}
        {!allTerminatedHaveReasons && terminatedCount > 0 && (
          <Typography sx={{ fontFamily, fontSize: 13, color: destructiveColor, textAlign: 'center', mt: 2 }}>
            Please select a termination reason for all terminated employees before confirming.
          </Typography>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleConfirmSync}
            disabled={confirming || !allTerminatedHaveReasons}
            sx={{
              fontFamily,
              fontSize: 14,
              fontWeight: 500,
              textTransform: 'none',
              backgroundColor: levelsetGreen,
              color: '#ffffff',
              px: 4,
              py: 1.5,
              borderRadius: '8px',
              '&:hover': {
                backgroundColor: '#2d5a42',
              },
              '&:disabled': {
                backgroundColor: 'var(--ls-color-disabled-text)',
              },
            }}
          >
            {confirming ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Confirm Roster Updates'}
          </Button>
        </Box>
      </Box>
    );
  };

  // Render Config Page: Sync Configuration
  const renderConfigPage = () => {
    if (!notification) return null;

    const weekStart = notification.sync_data?.week_start_date;
    let weekLabel = '';
    if (weekStart) {
      const start = new Date(weekStart + 'T00:00:00');
      const end = new Date(weekStart + 'T00:00:00');
      end.setDate(end.getDate() + 6);
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      weekLabel = `${fmt(start)} – ${fmt(end)}`;
    }

    return (
      <Box sx={{ py: 2 }}>
        <Typography sx={{ fontFamily, fontSize: 18, fontWeight: 600, color: 'var(--ls-color-neutral-soft-foreground)', mb: 3 }}>
          Sync Configuration
        </Typography>

        {weekLabel && (
          <Box sx={{
            border: '1px solid var(--ls-color-border)',
            borderRadius: '8px',
            p: 2,
            mb: 3,
            backgroundColor: 'var(--ls-color-muted-soft)',
          }}>
            <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)', mb: 0.5 }}>
              Detected Schedule Week
            </Typography>
            <Typography sx={{ fontFamily, fontSize: 16, fontWeight: 600 }}>
              {weekLabel}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            border: '1px solid var(--ls-color-border)', borderRadius: '8px', p: 2,
          }}>
            <Box>
              <Typography sx={{ fontFamily, fontSize: 15, fontWeight: 600 }}>
                Roster Sync
              </Typography>
              <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)' }}>
                Sync employee roster data from HotSchedules
              </Typography>
            </Box>
            <Switch checked={true} disabled sx={{
              '& .MuiSwitch-switchBase.Mui-checked': { color: levelsetGreen },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: levelsetGreen },
            }} />
          </Box>

          {hasSchedulingFeature && (
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              border: '1px solid var(--ls-color-border)', borderRadius: '8px', p: 2,
            }}>
              <Box>
                <Typography sx={{ fontFamily, fontSize: 15, fontWeight: 600 }}>
                  Schedule Sync
                </Typography>
                <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)' }}>
                  Import shifts and assignments for the detected week
                </Typography>
              </Box>
              <Switch
                checked={scheduleToggle}
                onChange={(e) => setScheduleToggle(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: levelsetGreen },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: levelsetGreen },
                }}
              />
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="contained"
            onClick={() => setCurrentPage('review')}
            sx={{
              fontFamily, fontSize: 14, fontWeight: 500, textTransform: 'none',
              backgroundColor: levelsetGreen, color: '#ffffff', px: 4, py: 1.5, borderRadius: '8px',
              '&:hover': { backgroundColor: '#2d5a42' },
            }}
          >
            Continue
          </Button>
        </Box>
      </Box>
    );
  };

  // Fetch org positions when schedule toggle turns on
  React.useEffect(() => {
    if (!scheduleToggle || !orgId) return;

    const fetchPositions = async () => {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from('org_positions')
        .select('id, name, zone')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .eq('scheduling_enabled', true)
        .order('zone', { ascending: true })
        .order('display_order', { ascending: true });

      setOrgPositions(data || []);
    };

    fetchPositions();
  }, [scheduleToggle, orgId]);

  // Render Position Mapping Page
  const renderPositionMappingPage = () => {
    if (!notification?.sync_data?.scheduling) return null;
    const scheduling = notification.sync_data.scheduling;
    const allJobs = scheduling.hs_jobs_used || [];

    // Pre-populate mappings from already-mapped jobs
    const getMappingForJob = (hsJobId: number): string | null => {
      if (positionMappings.has(hsJobId)) return positionMappings.get(hsJobId) ?? null;
      const mapped = scheduling.mapped_jobs?.find((m: any) => m.hs_job_id === hsJobId);
      return mapped?.position_id || null;
    };

    const handleMappingChange = (hsJobId: number, positionId: string | null) => {
      const newMappings = new Map(positionMappings);
      newMappings.set(hsJobId, positionId);
      setPositionMappings(newMappings);
    };

    const handlePositionMappingConfirm = () => {
      setCurrentPage('schedule_review');
    };

    return (
      <Box sx={{ py: 2 }}>
        <Typography sx={{ fontFamily, fontSize: 18, fontWeight: 600, color: 'var(--ls-color-neutral-soft-foreground)', mb: 1 }}>
          Position Mapping
        </Typography>
        <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)', mb: 3 }}>
          Map HotSchedules jobs to Levelset positions. Unmapped jobs will have positions auto-created.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {allJobs.map((job: any) => {
            const currentMapping = getMappingForJob(job.hs_job_id);

            return (
              <Box key={job.hs_job_id} sx={{
                display: 'flex', alignItems: 'center', gap: 2,
                border: '1px solid var(--ls-color-border)', borderRadius: '8px', p: 2,
              }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 600 }}>
                    {job.hs_job_name}
                  </Typography>
                  <Typography sx={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)' }}>
                    {job.hs_role_name} · {job.shift_count} shift{job.shift_count !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <Select
                    value={currentMapping || '__auto__'}
                    onChange={(e) => {
                      const val = e.target.value as string;
                      handleMappingChange(job.hs_job_id, val === '__auto__' ? null : val);
                    }}
                    sx={{ fontFamily, fontSize: 13 }}
                  >
                    <MenuItem value="__auto__" sx={{ fontFamily, fontSize: 13, fontStyle: 'italic' }}>
                      Auto-create position
                    </MenuItem>
                    {orgPositions.map(pos => (
                      <MenuItem key={pos.id} value={pos.id} sx={{ fontFamily, fontSize: 13 }}>
                        {pos.name} ({pos.zone})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            );
          })}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="contained"
            onClick={handlePositionMappingConfirm}
            sx={{
              fontFamily, fontSize: 14, fontWeight: 500, textTransform: 'none',
              backgroundColor: levelsetGreen, color: '#ffffff', px: 4, py: 1.5, borderRadius: '8px',
              '&:hover': { backgroundColor: '#2d5a42' },
            }}
          >
            Continue to Schedule Review
          </Button>
        </Box>
      </Box>
    );
  };

  // Render Schedule Review Page
  const renderScheduleReviewPage = () => {
    if (!notification?.sync_data?.scheduling) return null;
    const scheduling = notification.sync_data.scheduling;
    const shiftsByEmployee = scheduling.shifts_by_employee || [];

    // Summary stats
    const totalShifts = scheduling.total_shifts;
    const totalEmployees = scheduling.total_employees_scheduled;
    const totalHours = scheduling.total_hours;

    const handleScheduleConfirm = async () => {
      if (!notification) return;
      setScheduleSyncing(true);
      try {
        // Build position_mappings array from user selections + existing mapped jobs
        const allJobs = scheduling.hs_jobs_used || [];
        const mappingsPayload = allJobs.map((job: any) => {
          const userMapping = positionMappings.get(job.hs_job_id);
          const existingMapping = scheduling.mapped_jobs?.find((m: any) => m.hs_job_id === job.hs_job_id);

          return {
            hs_job_id: job.hs_job_id,
            hs_job_name: job.hs_job_name,
            hs_role_id: job.hs_role_id,
            hs_role_name: job.hs_role_name,
            position_id: userMapping !== undefined ? userMapping : (existingMapping?.position_id || null),
          };
        });

        const response = await fetch('/api/scheduling/sync-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notification_id: notification.id,
            week_start_date: notification.sync_data.week_start_date,
            location_id: locationId,
            org_id: orgId,
            position_mappings: mappingsPayload,
          }),
        });

        if (!response.ok) throw new Error('Failed to sync schedule');

        const data = await response.json();
        setScheduleStats(data);
        setCurrentPage('confirmation');
      } catch (error) {
        console.error('Error syncing schedule:', error);
        alert('Failed to sync schedule. Please try again.');
      } finally {
        setScheduleSyncing(false);
      }
    };

    return (
      <Box sx={{ py: 2 }}>
        <Typography sx={{ fontFamily, fontSize: 18, fontWeight: 600, color: 'var(--ls-color-neutral-soft-foreground)', mb: 2 }}>
          Schedule Review
        </Typography>

        {/* Summary bar */}
        <Box sx={{
          display: 'flex', gap: 3, mb: 3, p: 2, borderRadius: '8px',
          backgroundColor: 'var(--ls-color-muted-soft)',
          border: '1px solid var(--ls-color-border)',
        }}>
          <Box>
            <Typography sx={{ fontFamily, fontSize: 22, fontWeight: 700, color: levelsetGreen }}>
              {totalShifts}
            </Typography>
            <Typography sx={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)' }}>Shifts</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontFamily, fontSize: 22, fontWeight: 700, color: levelsetGreen }}>
              {totalEmployees}
            </Typography>
            <Typography sx={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)' }}>Employees</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontFamily, fontSize: 22, fontWeight: 700, color: levelsetGreen }}>
              {totalHours.toFixed(1)}
            </Typography>
            <Typography sx={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)' }}>Hours</Typography>
          </Box>
          {scheduling.total_estimated_cost > 0 && (
            <Box>
              <Typography sx={{ fontFamily, fontSize: 22, fontWeight: 700, color: levelsetGreen }}>
                ${scheduling.total_estimated_cost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </Typography>
              <Typography sx={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)' }}>Est. Cost</Typography>
            </Box>
          )}
        </Box>

        {/* Shifts grouped by employee */}
        {shiftsByEmployee.map((group: any) => (
          <Accordion
            key={group.hs_employee_id}
            defaultExpanded={false}
            sx={{
              mb: 1,
              '&:before': { display: 'none' },
              border: '1px solid var(--ls-color-border)',
              borderRadius: '8px !important',
              overflow: 'hidden',
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1 } }}
            >
              <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 600 }}>
                {group.employee_name}
              </Typography>
              <Box sx={{
                backgroundColor: levelsetGreen, color: 'white', borderRadius: '12px',
                px: 1.5, py: 0.25, fontSize: 12, fontFamily, fontWeight: 600,
              }}>
                {group.shifts.length}
              </Box>
              {!group.levelset_employee_id && group.hs_employee_id !== 0 && (
                <Typography sx={{ fontFamily, fontSize: 11, color: warningColor, fontStyle: 'italic' }}>
                  Not matched
                </Typography>
              )}
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontFamily, fontSize: 13 }}>
                <Box component="thead">
                  <Box component="tr" sx={{ backgroundColor: 'var(--ls-color-muted-soft)' }}>
                    <Box component="th" sx={{ textAlign: 'left', p: 1, pl: 2, fontWeight: 600 }}>Day</Box>
                    <Box component="th" sx={{ textAlign: 'left', p: 1, fontWeight: 600 }}>Start</Box>
                    <Box component="th" sx={{ textAlign: 'left', p: 1, fontWeight: 600 }}>End</Box>
                    <Box component="th" sx={{ textAlign: 'left', p: 1, fontWeight: 600 }}>Position</Box>
                    <Box component="th" sx={{ textAlign: 'right', p: 1, pr: 2, fontWeight: 600 }}>Hours</Box>
                  </Box>
                </Box>
                <Box component="tbody">
                  {group.shifts.map((shift: any) => {
                    const shiftDate = new Date(shift.date + 'T00:00:00');
                    const dayName = shiftDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    const netHours = ((shift.duration_minutes - shift.break_minutes) / 60).toFixed(1);

                    return (
                      <Box key={shift.hs_shift_id} component="tr" sx={{
                        backgroundColor: 'rgba(49, 102, 74, 0.04)',
                        '&:hover': { backgroundColor: 'rgba(49, 102, 74, 0.08)' },
                      }}>
                        <Box component="td" sx={{ p: 1, pl: 2 }}>{dayName}</Box>
                        <Box component="td" sx={{ p: 1, fontFamily: 'monospace', fontSize: 12 }}>{shift.start_time}</Box>
                        <Box component="td" sx={{ p: 1, fontFamily: 'monospace', fontSize: 12 }}>{shift.end_time}</Box>
                        <Box component="td" sx={{ p: 1 }}>{shift.hs_job_name}</Box>
                        <Box component="td" sx={{ p: 1, pr: 2, textAlign: 'right' }}>{netHours}h</Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}

        {/* Apply Schedule Button */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="contained"
            onClick={handleScheduleConfirm}
            disabled={scheduleSyncing}
            sx={{
              fontFamily, fontSize: 14, fontWeight: 500, textTransform: 'none',
              backgroundColor: levelsetGreen, color: '#ffffff', px: 4, py: 1.5, borderRadius: '8px',
              '&:hover': { backgroundColor: '#2d5a42' },
              '&:disabled': { backgroundColor: 'var(--ls-color-disabled-text)' },
            }}
          >
            {scheduleSyncing ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Apply Schedule'}
          </Button>
        </Box>
      </Box>
    );
  };

  // Render Page 3: Confirmation Summary
  const renderConfirmationPage = () => {
    if (!confirmationStats && !scheduleStats) return null;

    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography sx={{ fontFamily, fontSize: 24, fontWeight: 600, color: 'var(--ls-color-neutral-soft-foreground)', mb: 4 }}>
          Sync Complete!
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
          {confirmationStats && confirmationStats.created > 0 && (
            <Typography sx={{ fontFamily, fontSize: 16, color: levelsetGreen, fontWeight: 500 }}>
              {confirmationStats.created} new {confirmationStats.created === 1 ? 'employee was' : 'employees were'} added to your roster
            </Typography>
          )}
          {confirmationStats && confirmationStats.updated > 0 && (
            <Typography sx={{ fontFamily, fontSize: 16, color: warningColor, fontWeight: 500 }}>
              {confirmationStats.updated} {confirmationStats.updated === 1 ? 'employee was' : 'employees were'} modified in your roster
            </Typography>
          )}
          {confirmationStats && confirmationStats.deactivated > 0 && (
            <Typography sx={{ fontFamily, fontSize: 16, color: destructiveColor, fontWeight: 500 }}>
              {confirmationStats.deactivated} {confirmationStats.deactivated === 1 ? 'employee was' : 'employees were'} removed from your roster
            </Typography>
          )}

          {scheduleStats && (
            <>
              <Box sx={{ borderTop: '1px solid var(--ls-color-border)', pt: 2, mt: 1 }} />
              <Typography sx={{ fontFamily, fontSize: 16, color: levelsetGreen, fontWeight: 500 }}>
                {scheduleStats.shifts_created} shifts synced ({scheduleStats.total_hours} hours)
              </Typography>
              <Typography sx={{ fontFamily, fontSize: 16, color: levelsetGreen, fontWeight: 500 }}>
                {scheduleStats.assignments_created} shift assignments created
              </Typography>
              {scheduleStats.total_cost > 0 && (
                <Typography sx={{ fontFamily, fontSize: 16, color: 'var(--ls-color-muted)', fontWeight: 500 }}>
                  Est. labor cost: ${scheduleStats.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              )}
            </>
          )}
        </Box>

        <Button
          variant="contained"
          onClick={handleBackToRoster}
          sx={{
            fontFamily,
            fontSize: 14,
            fontWeight: 500,
            textTransform: 'none',
            backgroundColor: levelsetGreen,
            color: '#ffffff',
            px: 4,
            py: 1.5,
            borderRadius: '8px',
            '&:hover': {
              backgroundColor: '#2d5a42',
            },
          }}
        >
          Done
        </Button>
      </Box>
    );
  };

  return (
    <>
      <StyledDialog
        open={open}
        onClose={handleClose}
        className={className}
        PaperProps={{
          sx: {
            fontFamily,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
          },
        }}
      >
        <StickyHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SyncIcon sx={{ color: levelsetGreen }} />
            <Typography
              sx={{
                fontFamily,
                fontSize: "20px",
                fontWeight: 600,
                color: "#181d27",
              }}
            >
              {scheduleImportMode ? 'Import Schedule from HotSchedules' : 'Sync from HotSchedules'}
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            sx={{
              color: "var(--ls-color-muted)",
              "&:hover": {
                backgroundColor: "var(--ls-color-muted-soft)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </StickyHeader>

        <ScrollableContent>
          {currentPage === 'instructions' && renderInstructionsPage()}
          {currentPage === 'config' && notification && renderConfigPage()}
          {currentPage === 'review' && notification && renderReviewPage()}
          {currentPage === 'position_mapping' && notification && renderPositionMappingPage()}
          {currentPage === 'schedule_review' && notification && renderScheduleReviewPage()}
          {currentPage === 'confirmation' && (confirmationStats || scheduleStats) && renderConfirmationPage()}
        </ScrollableContent>
      </StyledDialog>

      {/* Exit Confirmation Dialog */}
      <Dialog
        open={exitConfirmOpen}
        onClose={() => setExitConfirmOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '8px',
            fontFamily,
            padding: '24px',
          },
        }}
      >
        <Typography sx={{ fontFamily, fontSize: 18, fontWeight: 600, color: 'var(--ls-color-neutral-soft-foreground)', mb: 2 }}>
          Are you sure you want to exit your HotSchedules sync?
        </Typography>
        <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-muted)', mb: 3 }}>
          All roster changes will be lost if you exit the sync right now
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            onClick={() => setExitConfirmOpen(false)}
            sx={{
              fontFamily,
              fontSize: 14,
              fontWeight: 500,
              textTransform: 'none',
              color: 'var(--ls-color-muted)',
              borderRadius: '8px', // 4px default + 4px = 8px
              '&:hover': {
                backgroundColor: 'var(--ls-color-muted-soft)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExitAnyway}
            variant="contained"
            sx={{
              fontFamily,
              fontSize: 14,
              fontWeight: 500,
              textTransform: 'none',
              backgroundColor: destructiveColor,
              color: '#ffffff',
              borderRadius: '8px', // 4px default + 4px = 8px
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
            }}
          >
            Exit Anyway
          </Button>
        </Box>
      </Dialog>
    </>
  );
}
