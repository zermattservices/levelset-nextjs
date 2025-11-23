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

export interface SyncEmployeesModalProps {
  open: boolean;
  onClose: () => void;
  locationId?: string;
  orgId?: string;
  className?: string;
  onSyncComplete?: () => void; // Callback to refresh RosterTable
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a';
const warningColor = '#FACC15';
const destructiveColor = '#dc2626';

type Page = 'instructions' | 'review' | 'confirmation';

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
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
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
  backgroundColor: '#ffffff',
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
}: SyncEmployeesModalProps) {
  const [currentPage, setCurrentPage] = React.useState<Page>('instructions');
  const [exitConfirmOpen, setExitConfirmOpen] = React.useState(false);
  const [notification, setNotification] = React.useState<SyncNotification | null>(null);
  const [hasSyncedBefore, setHasSyncedBefore] = React.useState(false);
  const [employeeEdits, setEmployeeEdits] = React.useState<Map<string, EmployeeEdit>>(new Map());
  const [keptEmployees, setKeptEmployees] = React.useState<Set<number>>(new Set());
  const [confirming, setConfirming] = React.useState(false);
  const [editTrigger, setEditTrigger] = React.useState(0); // Force re-render when edits change
  const [confirmationStats, setConfirmationStats] = React.useState<{
    created: number;
    updated: number;
    deactivated: number;
  } | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  const bookmarkletCode = React.useMemo(() => {
    if (!baseUrl) return '';
    if (!locationId || !orgId) return '';
    
    const code = `javascript:(function(){
var baseUrl='${baseUrl}';
var locationId='${locationId}';
var orgId='${orgId}';
var loadingDiv=document.createElement('div');
loadingDiv.style.cssText='position:fixed;top:20px;right:20px;background:#31664a;color:white;padding:15px 20px;border-radius:8px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui,sans-serif;';
loadingDiv.textContent='Fetching employee data...';
document.body.appendChild(loadingDiv);
var hsOrigin=window.location.origin;
var apiUrl=hsOrigin+'/hs/spring/client/employee/?active=true&_='+Date.now();
fetch(apiUrl,{method:'GET',credentials:'include',headers:{'Accept':'application/json'}}).then(function(r){if(!r.ok){throw new Error('Failed to fetch employees: '+r.status);}return r.json();}).then(function(allEmployees){if(!Array.isArray(allEmployees)||allEmployees.length===0){throw new Error('No employee data received from HotSchedules API');}var visibleEmployees=allEmployees.filter(function(emp){return emp.visible===true;});if(visibleEmployees.length===0){throw new Error('No visible employees found in the data');}loadingDiv.textContent='Syncing employees...';return fetch(baseUrl+'/api/employees/sync-hotschedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employees:visibleEmployees,location_id:locationId,org_id:orgId})});}).then(function(r){if(!r.ok){return r.json().then(function(data){throw new Error(data.error||'Sync failed');});}return r.json();}).then(function(data){loadingDiv.remove();var resultDiv=document.createElement('div');resultDiv.style.cssText='position:fixed;top:20px;right:20px;background:'+(data.success?'#10b981':'#ef4444')+';color:white;padding:20px;border-radius:8px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui,sans-serif;max-width:400px;';if(data.success){resultDiv.innerHTML='<strong>Sync Successful!</strong><br><br>Created: '+data.stats.created+'<br>Updated: '+data.stats.updated+'<br>Terminated: '+data.stats.terminated+'<br>Total: '+data.stats.total_processed;}else{resultDiv.innerHTML='<strong>Sync Failed</strong><br><br>'+data.error+(data.details?'<br><br>Details: '+data.details:'');}document.body.appendChild(resultDiv);setTimeout(function(){resultDiv.remove();},8000);}).catch(function(err){loadingDiv.remove();var errorDiv=document.createElement('div');errorDiv.style.cssText='position:fixed;top:20px;right:20px;background:#ef4444;color:white;padding:20px;border-radius:8px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui,sans-serif;max-width:400px;';errorDiv.innerHTML='<strong>Error</strong><br><br>'+err.message;document.body.appendChild(errorDiv);setTimeout(function(){errorDiv.remove();},8000);});
})();`;
    
    return code;
  }, [baseUrl, locationId, orgId]);

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

  // Poll for sync notifications on Page 1
  React.useEffect(() => {
    if (currentPage !== 'instructions' || !locationId || !open) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/employees/sync-notification?location_id=${locationId}`);
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.notification) {
          setNotification(data.notification);
          setCurrentPage('review');
        }
      } catch (error) {
        console.error('Error polling for notifications:', error);
      }
    }, 2500); // Poll every 2.5 seconds

    return () => clearInterval(pollInterval);
  }, [currentPage, locationId, open]);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setCurrentPage('instructions');
      setNotification(null);
      setEmployeeEdits(new Map());
      setKeptEmployees(new Set());
      setConfirmationStats(null);
      setExitConfirmOpen(false);
    }
  }, [open]);

  const handleClose = () => {
    if (currentPage === 'instructions') {
      onClose();
    } else {
      setExitConfirmOpen(true);
    }
  };

  const handleExitAnyway = () => {
    setExitConfirmOpen(false);
    onClose();
  };

  const handleConfirmSync = async () => {
    if (!notification) return;
    
    setConfirming(true);
    try {
      const newEmployeesUpdates = (notification.sync_data.new_employees || []).map(emp => {
        const edit = employeeEdits.get(emp.id);
        return {
          id: emp.id,
          role: edit?.role,
          is_foh: edit?.is_foh,
          is_boh: edit?.is_boh,
          availability: edit?.availability,
        };
      }).filter(emp => emp.role || emp.is_foh !== undefined || emp.is_boh !== undefined || emp.availability);

      const response = await fetch('/api/employees/confirm-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: notification.id,
          new_employees: newEmployeesUpdates,
          kept_employees: Array.from(keptEmployees),
        }),
      });

      if (!response.ok) throw new Error('Failed to confirm sync');

      const data = await response.json();
      setConfirmationStats(data.stats);
      setCurrentPage('confirmation');
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
            color: '#d1d5db',
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
                <Typography variant="body2" sx={{ fontFamily, fontSize: 12, color: '#6b7280', mt: 1, textAlign: 'center' }}>
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
                    Navigate to the Scheduling page
                  </Typography>
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <Typography variant="body2" component="span" sx={{ fontFamily }}>
                    Click the bookmark you just added to your bookmarks bar
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" component="span" sx={{ fontFamily }}>
                    The bookmark will automatically extract employee data and sync it to Levelset
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

  const handleRoleMenuOpen = (event: React.MouseEvent<HTMLElement>, employeeId: string) => {
    setRoleMenuAnchor(prev => ({ ...prev, [employeeId]: event.currentTarget }));
  };

  const handleRoleMenuClose = (employeeId: string) => {
    setRoleMenuAnchor(prev => ({ ...prev, [employeeId]: null }));
  };

  const handleRoleSelect = (employeeId: string, role: string) => {
    handleRoleMenuClose(employeeId);
    const newEdits = new Map(employeeEdits);
    const edit: EmployeeEdit = newEdits.get(employeeId) || { id: employeeId };
    edit.role = role;
    newEdits.set(employeeId, edit);
    setEmployeeEdits(newEdits);
    setEditTrigger(prev => prev + 1);
  };

  const handleAvailabilityMenuOpen = (event: React.MouseEvent<HTMLElement>, employeeId: string) => {
    setAvailabilityMenuAnchor(prev => ({ ...prev, [employeeId]: event.currentTarget }));
  };

  const handleAvailabilityMenuClose = (employeeId: string) => {
    setAvailabilityMenuAnchor(prev => ({ ...prev, [employeeId]: null }));
  };

  const handleAvailabilitySelect = (employeeId: string, availability: AvailabilityType) => {
    handleAvailabilityMenuClose(employeeId);
    const newEdits = new Map(employeeEdits);
    const edit: EmployeeEdit = newEdits.get(employeeId) || { id: employeeId };
    edit.availability = availability;
    newEdits.set(employeeId, edit);
    setEmployeeEdits(newEdits);
    setEditTrigger(prev => prev + 1);
  };

  // Helper to create employee table columns
  const createEmployeeColumns = (
    editable: boolean,
    showKeepButton: boolean = false
  ): GridColDef[] => {
    const columns: GridColDef[] = [
      {
        field: 'name',
        headerName: 'Name',
        width: 200,
        flex: 1,
        renderCell: (params) => (
          <Typography sx={{ fontFamily, fontSize: 14 }}>
            {params.row.first_name} {params.row.last_name}
          </Typography>
        ),
      },
      {
        field: 'role',
        headerName: 'Current Role',
        width: 150,
        renderCell: (params) => {
          const currentRole = params.value || 'Team Member';
          const menuAnchor = roleMenuAnchor[params.row.id] || null;
          const menuOpen = editable && Boolean(menuAnchor);
          
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
              {editable ? (
                <Button
                  onClick={(e) => handleRoleMenuOpen(e, params.row.id)}
                  sx={{ fontFamily, fontSize: 12, textTransform: 'none', p: 0 }}
                >
                  <RolePill role={currentRole} />
                </Button>
              ) : (
                <RolePill role={currentRole} />
              )}
              <Menu
                anchorEl={menuAnchor}
                open={menuOpen}
                onClose={() => handleRoleMenuClose(params.row.id)}
                disableAutoFocusItem
                MenuListProps={{ 'aria-labelledby': undefined }}
              >
                {roles.map((role) => (
                  <MenuItem
                    key={role}
                    onClick={() => handleRoleSelect(params.row.id, role)}
                    sx={{ fontFamily, fontSize: 12 }}
                  >
                    {role}
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          );
        },
      },
      {
        field: 'is_foh',
        headerName: 'FOH',
        width: 80,
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
                  color: '#9ca3af',
                  '&.Mui-checked': {
                    color: levelsetGreen,
                  },
                }}
              />
            </Box>
          );
        },
      },
      {
        field: 'is_boh',
        headerName: 'BOH',
        width: 80,
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
                  color: '#9ca3af',
                  '&.Mui-checked': {
                    color: levelsetGreen,
                  },
                }}
              />
            </Box>
          );
        },
      },
      {
        field: 'availability',
        headerName: 'Availability',
        width: 150,
        renderCell: (params) => {
          const edit = employeeEdits.get(params.row.id);
          const avail = edit?.availability || params.value || 'Available';
          const menuAnchor = availabilityMenuAnchor[params.row.id] || null;
          const menuOpen = editable && Boolean(menuAnchor);
          
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
              {editable ? (
                <Button
                  onClick={(e) => handleAvailabilityMenuOpen(e, params.row.id)}
                  sx={{ fontFamily, fontSize: 12, textTransform: 'none', p: 0 }}
                >
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px 12px',
                      borderRadius: '14px',
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily,
                      backgroundColor: avail === 'Available' ? '#dcfce7' : '#fef3c7',
                      color: avail === 'Available' ? '#166534' : '#d97706',
                    }}
                  >
                    {avail}
                  </Box>
                </Button>
              ) : (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 12px',
                    borderRadius: '14px',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily,
                    backgroundColor: avail === 'Available' ? '#dcfce7' : '#fef3c7',
                    color: avail === 'Available' ? '#166534' : '#d97706',
                  }}
                >
                  {avail}
                </Box>
              )}
              <Menu
                anchorEl={menuAnchor}
                open={menuOpen}
                onClose={() => handleAvailabilityMenuClose(params.row.id)}
                disableAutoFocusItem
                MenuListProps={{ 'aria-labelledby': undefined }}
              >
                {availabilities.map((avail) => (
                  <MenuItem
                    key={avail}
                    onClick={() => handleAvailabilitySelect(params.row.id, avail)}
                    sx={{ fontFamily, fontSize: 12 }}
                  >
                    {avail}
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          );
        },
      },
      {
        field: 'hire_date',
        headerName: 'Hire Date',
        width: 120,
        renderCell: (params) => (
          <Typography sx={{ fontFamily, fontSize: 14 }}>
            {params.value ? new Date(params.value).toLocaleDateString() : '-'}
          </Typography>
        ),
      },
    ];

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
  };

  // Convert Maps/Sets to serializable format for dependency tracking
  const employeeEditsSize = employeeEdits.size;
  const roleMenuAnchorKeys = Object.keys(roleMenuAnchor).length;
  const availabilityMenuAnchorKeys = Object.keys(availabilityMenuAnchor).length;
  const keptEmployeesSize = keptEmployees.size;
  
  // Memoize columns - only create when on review page to avoid hook order issues
  const editableColumns = React.useMemo(() => {
    if (currentPage !== 'review') return [];
    return createEmployeeColumns(true, false);
  }, [currentPage, editTrigger, employeeEditsSize, roleMenuAnchorKeys, availabilityMenuAnchorKeys]);
  
  const readOnlyColumns = React.useMemo(() => {
    if (currentPage !== 'review') return [];
    return createEmployeeColumns(false, true);
  }, [currentPage, keptEmployeesSize]);

  // Render Page 2: Review Changes
  const renderReviewPage = () => {
    if (!notification) return null;

    const syncData = notification.sync_data;
    const newEmployees = syncData.new_employees || [];
    const modifiedEmployees = syncData.modified_employees || [];
    const terminatedEmployees = syncData.terminated_employees || [];

    const hasChanges = newEmployees.length > 0 || modifiedEmployees.length > 0 || terminatedEmployees.length > 0;

    if (!hasChanges) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ fontFamily, fontSize: 18, fontWeight: 600, color: '#111827', mb: 2 }}>
            Your roster is up to date
          </Typography>
          <Typography sx={{ fontFamily, fontSize: 14, color: '#6b7280' }}>
            No changes were made.
          </Typography>
        </Box>
      );
    }

    // Prepare new employees data with default role - reactive to edits
    const newEmployeesData = React.useMemo(() => {
      return newEmployees.map(emp => {
        const edit = employeeEdits.get(emp.id);
        return {
          id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          role: edit?.role || (hasSyncedBefore ? 'New Hire' : 'Team Member'),
          is_foh: edit?.is_foh !== undefined ? edit.is_foh : false,
          is_boh: edit?.is_boh !== undefined ? edit.is_boh : false,
          availability: edit?.availability || ('Available' as AvailabilityType),
          hire_date: emp.hire_date,
          hs_id: emp.hs_id,
        };
      });
    }, [newEmployees, employeeEdits, hasSyncedBefore, editTrigger]);

    // Prepare terminated employees data
    const terminatedEmployeesData = React.useMemo(() => {
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
      }));
    }, [terminatedEmployees]);

    // Count terminated employees (excluding kept ones)
    const terminatedCount = terminatedEmployeesData.filter(emp => !keptEmployees.has(Number(emp.hs_id))).length;

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
              border: `1px solid ${levelsetGreen}`,
              borderRadius: '8px',
              mb: 2,
            },
            '&.Mui-disabled': {
              backgroundColor: '#f9fafb',
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
            <Typography sx={{ fontFamily, fontSize: 14, color: '#6b7280', ml: 1 }}>
              {newEmployees.length > 0 ? `${newEmployees.length} employees` : 'No employees'}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ padding: 0 }}>
            {newEmployees.length > 0 && editableColumns.length > 0 && (
              <Box sx={{ p: 2 }}>
                <Box sx={{ height: 400, width: '100%' }}>
                  <DataGridPro
                    rows={newEmployeesData}
                    columns={editableColumns}
                    disableRowSelectionOnClick
                    hideFooter
                    sx={{
                      fontFamily,
                      border: 'none',
                      '& .MuiDataGrid-cell': {
                        borderBottom: '1px solid #e5e7eb',
                      },
                      '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: '#f9fafb',
                        borderBottom: '2px solid #e5e7eb',
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
              border: `1px solid ${warningColor}`,
              borderRadius: '8px',
              mb: 2,
            },
            '&.Mui-disabled': {
              backgroundColor: '#f9fafb',
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
            <Typography sx={{ fontFamily, fontSize: 14, color: '#6b7280', ml: 1 }}>
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
              border: `1px solid ${destructiveColor}`,
              borderRadius: '8px',
              mb: 2,
            },
            '&.Mui-disabled': {
              backgroundColor: '#f9fafb',
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
            <Typography sx={{ fontFamily, fontSize: 14, color: '#6b7280', ml: 1 }}>
              {terminatedCount > 0 ? `${terminatedCount} employees` : 'No employees'}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ padding: 0 }}>
            {terminatedEmployeesData.length > 0 && readOnlyColumns.length > 0 && (
              <Box sx={{ p: 2 }}>
                <Box sx={{ height: 400, width: '100%' }}>
                  <DataGridPro
                    rows={terminatedEmployeesData}
                    columns={readOnlyColumns}
                    disableRowSelectionOnClick
                    hideFooter
                    getRowClassName={(params) => 
                      keptEmployees.has(Number(params.row.hs_id)) ? '' : 'terminated-row'
                    }
                    sx={{
                      fontFamily,
                      border: 'none',
                      '& .MuiDataGrid-cell': {
                        borderBottom: '1px solid #e5e7eb',
                      },
                      '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: '#f9fafb',
                        borderBottom: '2px solid #e5e7eb',
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
                  <Box sx={{ mt: 2, p: 2, backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                    {Array.from(keptEmployees).map(hsId => {
                      const emp = terminatedEmployeesData.find(e => Number(e.hs_id) === hsId);
                      if (!emp) return null;
                      return (
                        <Typography key={hsId} sx={{ fontFamily, fontSize: 12, color: '#6b7280', mb: 1 }}>
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
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="contained"
            onClick={handleConfirmSync}
            disabled={confirming}
            sx={{
              fontFamily,
              fontSize: 14,
              fontWeight: 500,
              textTransform: 'none',
              backgroundColor: levelsetGreen,
              color: '#ffffff',
              px: 4,
              py: 1.5,
              '&:hover': {
                backgroundColor: '#2d5a42',
              },
              '&:disabled': {
                backgroundColor: '#9ca3af',
              },
            }}
          >
            {confirming ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Confirm Roster Updates'}
          </Button>
        </Box>
      </Box>
    );
  };

  // Render Page 3: Confirmation Summary
  const renderConfirmationPage = () => {
    if (!confirmationStats) return null;

    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography sx={{ fontFamily, fontSize: 24, fontWeight: 600, color: '#111827', mb: 4 }}>
          Sync Complete!
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
          {confirmationStats.created > 0 && (
            <Typography sx={{ fontFamily, fontSize: 16, color: levelsetGreen, fontWeight: 500 }}>
              {confirmationStats.created} new {confirmationStats.created === 1 ? 'employee was' : 'employees were'} added to your roster
            </Typography>
          )}
          {confirmationStats.updated > 0 && (
            <Typography sx={{ fontFamily, fontSize: 16, color: warningColor, fontWeight: 500 }}>
              {confirmationStats.updated} {confirmationStats.updated === 1 ? 'employee was' : 'employees were'} modified in your roster
            </Typography>
          )}
          {confirmationStats.deactivated > 0 && (
            <Typography sx={{ fontFamily, fontSize: 16, color: destructiveColor, fontWeight: 500 }}>
              {confirmationStats.deactivated} {confirmationStats.deactivated === 1 ? 'employee was' : 'employees were'} removed from your roster
            </Typography>
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
            '&:hover': {
              backgroundColor: '#2d5a42',
            },
          }}
        >
          Back to Roster
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
              Sync Employees from HotSchedules
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            sx={{
              color: "#6b7280",
              "&:hover": {
                backgroundColor: "#f3f4f6",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </StickyHeader>

        <ScrollableContent>
          {currentPage === 'instructions' && renderInstructionsPage()}
          {currentPage === 'review' && notification && renderReviewPage()}
          {currentPage === 'confirmation' && confirmationStats && renderConfirmationPage()}
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
        <Typography sx={{ fontFamily, fontSize: 18, fontWeight: 600, color: '#111827', mb: 2 }}>
          Are you sure you want to exit your HotSchedules sync?
        </Typography>
        <Typography sx={{ fontFamily, fontSize: 14, color: '#6b7280', mb: 3 }}>
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
              color: '#6b7280',
              '&:hover': {
                backgroundColor: '#f3f4f6',
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
