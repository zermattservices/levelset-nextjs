"use client";

import * as React from "react";
import {
  Dialog,
  IconButton,
  Box,
  Typography,
  Button,
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
  Skeleton,
  TextField,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SyncIcon from "@mui/icons-material/Sync";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddIcon from "@mui/icons-material/Add";
import { styled } from "@mui/material/styles";
import { DataGridPro, GridColDef } from "@mui/x-data-grid-pro";
import type { Employee, AvailabilityType } from "@/lib/supabase.types";
import { RolePill } from "./shared/RolePill";
import { createSupabaseClient } from "@/util/supabase/component";
import * as XLSX from 'xlsx';

export interface SyncHireDateModalProps {
  open: boolean;
  onClose: () => void;
  locationId?: string;
  orgId?: string;
  className?: string;
  onSyncComplete?: () => void;
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a';
const warningColor = '#FACC15';
const destructiveColor = '#dc2626';

type Page = 'instructions' | 'review' | 'confirmation';

interface PayrollSyncNotification {
  id: string;
  location_id: string;
  org_id: string;
  sync_data: {
    new_employees: any[];
    modified_employees: any[];
    terminated_employees: any[];
    unmatched_employees: any[];
  };
  created_at: string;
  viewed: boolean;
}

interface EmployeeEdit {
  id?: string;
  payroll_name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_foh?: boolean;
  is_boh?: boolean;
  availability?: AvailabilityType;
}

// Styled components
const RoleMenuItem = styled(MenuItem)(() => ({
  fontFamily: `"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  fontSize: 12,
  fontWeight: 500,
  padding: "8px 12px",
  margin: "2px 8px",
  borderRadius: 8,
  "&.Mui-selected": {
    backgroundColor: "#f3f4f6",
    "&:hover": {
      backgroundColor: "#e5e7eb",
    },
  },
  "&:hover": {
    backgroundColor: "#f9fafb",
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
  backgroundColor: "#f3f4f6",
  color: "#111827",
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

const UploadZone = styled(Box)<{ isDragging: boolean }>(({ isDragging }) => ({
  border: `2px dashed ${isDragging ? levelsetGreen : '#d1d5db'}`,
  borderRadius: '12px',
  padding: '48px 24px',
  textAlign: 'center',
  backgroundColor: isDragging ? '#f0f9f4' : '#f9fafb',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    borderColor: levelsetGreen,
    backgroundColor: '#f0f9f4',
  },
}));

export function SyncHireDateModal({
  open,
  onClose,
  locationId,
  orgId,
  className = "",
  onSyncComplete,
}: SyncHireDateModalProps) {
  const [currentPage, setCurrentPage] = React.useState<Page>('instructions');
  const [exitConfirmOpen, setExitConfirmOpen] = React.useState(false);
  const [notification, setNotification] = React.useState<PayrollSyncNotification | null>(null);
  const [hasSyncedBefore, setHasSyncedBefore] = React.useState(false);
  const [employeeEdits, setEmployeeEdits] = React.useState<Map<string, EmployeeEdit>>(new Map());
  const [unmatchedMappings, setUnmatchedMappings] = React.useState<Record<string, string | null>>({});
  const [keptEmployees, setKeptEmployees] = React.useState<Set<string>>(new Set());
  const [confirming, setConfirming] = React.useState(false);
  const [editTrigger, setEditTrigger] = React.useState(0);
  const [confirmationStats, setConfirmationStats] = React.useState<{
    created: number;
    updated: number;
    deactivated: number;
  } | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [allEmployees, setAllEmployees] = React.useState<Employee[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch has_synced_before flag and all employees
  React.useEffect(() => {
    if (!locationId || !open) return;
    
    const fetchData = async () => {
      const supabase = createSupabaseClient();
      const [locationResult, employeesResult] = await Promise.all([
        supabase
          .from('locations')
          .select('has_synced_before')
          .eq('id', locationId)
          .single(),
        supabase
          .from('employees')
          .select('*')
          .eq('location_id', locationId)
          .eq('active', true)
          .order('full_name'),
      ]);
      
      if (locationResult.data) {
        setHasSyncedBefore(locationResult.data.has_synced_before || false);
      }
      if (employeesResult.data) {
        setAllEmployees(employeesResult.data);
      }
    };
    
    fetchData();
  }, [locationId, open]);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setCurrentPage('instructions');
      setNotification(null);
      setEmployeeEdits(new Map());
      setUnmatchedMappings({});
      setKeptEmployees(new Set());
      setConfirmationStats(null);
      setExitConfirmOpen(false);
      setProcessing(false);
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

  // File upload handlers
  const handleFileSelect = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    setProcessing(true);
    setCurrentPage('review');

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const dataUrl = e.target?.result as string;
          // Extract base64 part (remove data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64, prefix)
          const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
          
          // Call sync API
          const response = await fetch('/api/employees/sync-hire-date', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileData: base64,
              location_id: locationId,
              org_id: orgId,
              unmatched_mappings: {}, // No mappings on initial upload
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to process file');
          }

          const data = await response.json();
          
          // Fetch the notification
          const supabase = createSupabaseClient();
          const { data: notificationData } = await supabase
            .from('payroll_sync_notifications')
            .select('*')
            .eq('id', data.notification_id)
            .single();

          if (notificationData) {
            setNotification(notificationData as PayrollSyncNotification);
            // Initialize unmatchedMappings with suggested matches
            const syncData = notificationData.sync_data;
            const initialMappings: Record<string, string | null> = {};
            (syncData.unmatched_employees || []).forEach((emp: any) => {
              if (emp.suggested_match_id) {
                initialMappings[emp.payroll_name] = emp.suggested_match_id;
              }
            });
            setUnmatchedMappings(initialMappings);
          }
        } catch (error) {
          console.error('Error processing file:', error);
          alert('Failed to process file. Please try again.');
          setCurrentPage('instructions');
        } finally {
          setProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      setProcessing(false);
      setCurrentPage('instructions');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleConfirmSync = async () => {
    if (!notification) return;
    
    setConfirming(true);
    try {
      const response = await fetch('/api/employees/confirm-hire-date-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: notification.id,
          unmatched_mappings: unmatchedMappings,
          employee_edits: Array.from(employeeEdits.values()),
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

  // Menu state for role and availability dropdowns
  const [roleMenuAnchor, setRoleMenuAnchor] = React.useState<{ [key: string]: HTMLElement | null }>({});
  const [availabilityMenuAnchor, setAvailabilityMenuAnchor] = React.useState<{ [key: string]: HTMLElement | null }>({});

  const roles: string[] = ['New Hire', 'Team Member', 'Trainer', 'Team Lead', 'Director', 'Executive', 'Operator'];
  const availabilities: AvailabilityType[] = ['Available', 'Limited'];

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

  // Render Page 1: Instructions with file upload
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
            Upload HR/Payroll Report
          </StepLabel>
          <StepContent>
            <Box sx={{ mt: 1, mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 2, fontFamily }}>
                Download the employee hire date report from your HR/Payroll software and upload it here.
              </Typography>
              <UploadZone
                isDragging={isDragging}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <CloudUploadIcon sx={{ fontSize: 48, color: levelsetGreen, mb: 2 }} />
                <Typography sx={{ fontFamily, fontSize: 16, fontWeight: 600, color: '#111827', mb: 1 }}>
                  Drag & drop your Excel file here
                </Typography>
                <Typography sx={{ fontFamily, fontSize: 14, color: '#6b7280', mb: 2 }}>
                  or click to browse
                </Typography>
                <Button
                  variant="outlined"
                  sx={{
                    fontFamily,
                    fontSize: 14,
                    fontWeight: 500,
                    textTransform: 'none',
                    borderColor: levelsetGreen,
                    color: levelsetGreen,
                    borderRadius: '8px',
                    '&:hover': {
                      borderColor: '#2d5a42',
                      backgroundColor: '#f0f9f4',
                    },
                  }}
                >
                  Select File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={handleFileInputChange}
                />
              </UploadZone>
            </Box>
          </StepContent>
        </Step>
      </Stepper>
    </Box>
  );

  // Prepare data for tables - always call useMemo to maintain hook order
  const syncData = notification?.sync_data;
  const newEmployees = React.useMemo(() => {
    if (!syncData) return [];
    // New employees are unmatched employees without mappings
    return (syncData.unmatched_employees || []).filter((u: any) => !unmatchedMappings[u.payroll_name]);
  }, [syncData, unmatchedMappings]);

  const modifiedEmployees = syncData?.modified_employees || [];
  const terminatedEmployees = syncData?.terminated_employees || [];
  const unmatchedEmployees = syncData?.unmatched_employees || [];

  // Prepare new employees data with edits
  const newEmployeesData = React.useMemo(() => {
    if (!notification || currentPage !== 'review') return [];
    return newEmployees.map((emp: any) => {
      const key = emp.payroll_name;
      const edit = employeeEdits.get(key);
      // Use mapped_role from spreadsheet if available, otherwise fall back to defaults
      const defaultRole = emp.mapped_role || (hasSyncedBefore ? 'New Hire' : 'Team Member');
      return {
        id: key,
        payroll_name: emp.payroll_name,
        job_title: emp.job_title || '',
        first_name: edit?.first_name || emp.parsed_first_name || '',
        last_name: edit?.last_name || emp.parsed_last_name || '',
        role: edit?.role || defaultRole,
        is_foh: edit?.is_foh !== undefined ? edit.is_foh : false,
        is_boh: edit?.is_boh !== undefined ? edit.is_boh : false,
        availability: edit?.availability || ('Available' as AvailabilityType),
        hire_date: emp.hire_date,
      };
    }).sort((a, b) => {
      const firstNameA = (a.first_name || '').toLowerCase();
      const firstNameB = (b.first_name || '').toLowerCase();
      return firstNameA.localeCompare(firstNameB);
    });
  }, [notification, currentPage, newEmployees, employeeEdits, hasSyncedBefore, editTrigger]);

  // Prepare terminated employees data
  const terminatedEmployeesData = React.useMemo(() => {
    if (!notification || currentPage !== 'review') return [];
    return terminatedEmployees.map((emp: any) => ({
      id: emp.id,
      payroll_name: emp.payroll_name,
      first_name: emp.first_name,
      last_name: emp.last_name,
      role: 'Team Member',
      is_foh: false,
      is_boh: false,
      availability: 'Available' as AvailabilityType,
      hire_date: null,
    })).sort((a, b) => {
      const firstNameA = (a.first_name || '').toLowerCase();
      const firstNameB = (b.first_name || '').toLowerCase();
      return firstNameA.localeCompare(firstNameB);
    });
  }, [notification, currentPage, terminatedEmployees]);

  const terminatedCount = React.useMemo(() => {
    if (!notification || currentPage !== 'review') return 0;
    return terminatedEmployeesData.filter(emp => !keptEmployees.has(emp.id)).length;
  }, [notification, currentPage, terminatedEmployeesData, keptEmployees]);

  // Create column definitions for new employees table
  const newEmployeeColumns = React.useMemo<GridColDef[]>(() => {
    if (currentPage !== 'review') return [];
    return [
      {
        field: 'payroll_name',
        headerName: 'Payroll Name',
        minWidth: 250,
        flex: 1,
        align: "left",
        headerAlign: "center",
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%' }}>
            <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 600, color: '#111827' }}>
              {params.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'first_name',
        headerName: 'First Name',
        width: 150,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const key = params.row.payroll_name;
          const edit = employeeEdits.get(key);
          const value = edit?.first_name !== undefined ? edit.first_name : params.value;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
              <TextField
                size="small"
                value={value}
                onChange={(e) => {
                  const newEdits = new Map(employeeEdits);
                  const empEdit: EmployeeEdit = newEdits.get(key) || { id: key, payroll_name: key };
                  empEdit.first_name = e.target.value;
                  newEdits.set(key, empEdit);
                  setEmployeeEdits(newEdits);
                  setEditTrigger(prev => prev + 1);
                }}
                sx={{
                  width: '100%',
                  '& .MuiOutlinedInput-root': {
                    fontFamily,
                    fontSize: 13,
                    height: 32,
                  },
                }}
              />
            </Box>
          );
        },
      },
      {
        field: 'last_name',
        headerName: 'Last Name',
        width: 150,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const key = params.row.payroll_name;
          const edit = employeeEdits.get(key);
          const value = edit?.last_name !== undefined ? edit.last_name : params.value;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
              <TextField
                size="small"
                value={value}
                onChange={(e) => {
                  const newEdits = new Map(employeeEdits);
                  const empEdit: EmployeeEdit = newEdits.get(key) || { id: key, payroll_name: key };
                  empEdit.last_name = e.target.value;
                  newEdits.set(key, empEdit);
                  setEmployeeEdits(newEdits);
                  setEditTrigger(prev => prev + 1);
                }}
                sx={{
                  width: '100%',
                  '& .MuiOutlinedInput-root': {
                    fontFamily,
                    fontSize: 13,
                    height: 32,
                  },
                }}
              />
            </Box>
          );
        },
      },
      {
        field: 'role',
        headerName: 'Current Role',
        flex: 1,
        minWidth: 120,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const currentRole = params.value || 'Team Member';
          const menuAnchor = roleMenuAnchor[params.row.payroll_name] || null;
          const menuOpen = Boolean(menuAnchor);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
              <RolePill
                role={currentRole}
                endIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: "#6b7280" }} />}
                onClick={(event) => handleRoleMenuOpen(event, params.row.payroll_name)}
              />
              <Menu
                anchorEl={menuAnchor}
                open={menuOpen}
                onClose={() => handleRoleMenuClose(params.row.payroll_name)}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                PaperProps={{
                  sx: {
                    fontFamily,
                    borderRadius: 2,
                    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #e5e7eb",
                  },
                }}
              >
                {roles.map((roleOption) => (
                  <RoleMenuItem
                    key={roleOption}
                    selected={currentRole === roleOption}
                    onClick={() => handleRoleSelect(params.row.payroll_name, roleOption)}
                  >
                    <RolePill role={roleOption} />
                  </RoleMenuItem>
                ))}
              </Menu>
            </Box>
          );
        },
      },
      {
        field: 'is_foh',
        headerName: 'FOH',
        width: 100,
        align: "center",
        headerAlign: "center",
        type: 'boolean',
        renderCell: (params) => {
          const key = params.row.payroll_name;
          const edit = employeeEdits.get(key);
          const checked = edit?.is_foh !== undefined ? edit.is_foh : (params.value || false);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <Checkbox
                checked={checked}
                onChange={(e) => {
                  const newEdits = new Map(employeeEdits);
                  const empEdit: EmployeeEdit = newEdits.get(key) || { id: key, payroll_name: key };
                  empEdit.is_foh = e.target.checked;
                  newEdits.set(key, empEdit);
                  setEmployeeEdits(newEdits);
                  setEditTrigger(prev => prev + 1);
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
        width: 100,
        align: "center",
        headerAlign: "center",
        type: 'boolean',
        renderCell: (params) => {
          const key = params.row.payroll_name;
          const edit = employeeEdits.get(key);
          const checked = edit?.is_boh !== undefined ? edit.is_boh : (params.value || false);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <Checkbox
                checked={checked}
                onChange={(e) => {
                  const newEdits = new Map(employeeEdits);
                  const empEdit: EmployeeEdit = newEdits.get(key) || { id: key, payroll_name: key };
                  empEdit.is_boh = e.target.checked;
                  newEdits.set(key, empEdit);
                  setEmployeeEdits(newEdits);
                  setEditTrigger(prev => prev + 1);
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
        flex: 1,
        minWidth: 120,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const key = params.row.payroll_name;
          const edit = employeeEdits.get(key);
          const avail = edit?.availability || params.value || 'Available';
          const menuAnchor = availabilityMenuAnchor[key] || null;
          const menuOpen = Boolean(menuAnchor);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
              <AvailabilityChip
                className={avail.toLowerCase()}
                onClick={(event) => handleAvailabilityMenuOpen(event, key)}
              >
                {avail}
                <ExpandMoreIcon sx={{ fontSize: 14, ml: 0.5 }} />
              </AvailabilityChip>
              <Menu
                anchorEl={menuAnchor}
                open={menuOpen}
                onClose={() => handleAvailabilityMenuClose(key)}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                PaperProps={{
                  sx: {
                    fontFamily,
                    borderRadius: 2,
                    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #e5e7eb",
                  },
                }}
              >
                {availabilities.map((availOption) => (
                  <MenuItem
                    key={availOption}
                    selected={avail === availOption}
                    onClick={() => handleAvailabilitySelect(key, availOption)}
                    sx={{
                      fontFamily,
                      fontSize: 12,
                      fontWeight: 500,
                      padding: "8px 12px",
                    }}
                  >
                    <AvailabilityChip className={availOption.toLowerCase()}>
                      {availOption}
                    </AvailabilityChip>
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
        flex: 1,
        minWidth: 100,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
            <Typography sx={{ fontFamily, fontSize: 13, color: '#6b7280' }}>
              {params.value ? new Date(params.value).toLocaleDateString() : '—'}
            </Typography>
          </Box>
        ),
      },
    ];
  }, [currentPage, employeeEdits, roleMenuAnchor, availabilityMenuAnchor, editTrigger, handleRoleMenuOpen, handleRoleMenuClose, handleRoleSelect, handleAvailabilityMenuOpen, handleAvailabilityMenuClose, handleAvailabilitySelect]);

  // Create column definitions for terminated employees table
  const terminatedColumns = React.useMemo<GridColDef[]>(() => {
    if (currentPage !== 'review') return [];
    return [
      {
        field: 'payroll_name',
        headerName: 'Payroll Name',
        width: 200,
        flex: 1,
        align: "left",
        headerAlign: "center",
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%' }}>
            <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 600, color: '#111827' }}>
              {params.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'name',
        headerName: 'Name',
        width: 200,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
            <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 500, color: '#111827' }}>
              {params.row.first_name} {params.row.last_name}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'role',
        headerName: 'Current Role',
        width: 180,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
            <RolePill role={params.value} />
          </Box>
        ),
      },
      {
        field: 'is_foh',
        headerName: 'FOH',
        width: 100,
        align: "center",
        headerAlign: "center",
        type: 'boolean',
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
            <Checkbox checked={params.value || false} disabled sx={{ color: '#9ca3af' }} />
          </Box>
        ),
      },
      {
        field: 'is_boh',
        headerName: 'BOH',
        width: 100,
        align: "center",
        headerAlign: "center",
        type: 'boolean',
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
            <Checkbox checked={params.value || false} disabled sx={{ color: '#9ca3af' }} />
          </Box>
        ),
      },
      {
        field: 'availability',
        headerName: 'Availability',
        width: 160,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
            <AvailabilityChip className={(params.value || 'Available').toLowerCase()}>
              {params.value || 'Available'}
            </AvailabilityChip>
          </Box>
        ),
      },
      {
        field: 'hire_date',
        headerName: 'Hire Date',
        width: 150,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
            <Typography sx={{ fontFamily, fontSize: 13, color: '#6b7280' }}>
              {params.value ? new Date(params.value).toLocaleDateString() : '—'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 100,
        align: "center",
        headerAlign: "center",
        sortable: false,
        renderCell: (params) => {
          const isKept = keptEmployees.has(params.row.id);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
              <Button
                variant={isKept ? "outlined" : "contained"}
                onClick={() => {
                  setKeptEmployees(prev => {
                    const newSet = new Set(prev);
                    if (isKept) {
                      newSet.delete(params.row.id);
                    } else {
                      newSet.add(params.row.id);
                    }
                    return newSet;
                  });
                }}
                sx={{
                  fontFamily,
                  fontSize: 12,
                  fontWeight: 500,
                  textTransform: 'none',
                  borderRadius: '8px',
                  minWidth: 80,
                  ...(isKept ? {
                    borderColor: levelsetGreen,
                    color: levelsetGreen,
                    backgroundColor: 'transparent',
                    '&:hover': {
                      borderColor: '#2d5a42',
                      backgroundColor: '#f0f9f4',
                    },
                  } : {
                    backgroundColor: levelsetGreen,
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#2d5a42',
                    },
                  }),
                }}
              >
                {isKept ? 'Kept' : 'Keep'}
              </Button>
            </Box>
          );
        },
      },
    ];
  }, [currentPage, keptEmployees]);

  // Render Page 2: Review Changes
  const renderReviewPage = () => {
    if (!notification) return null;

    const hasChanges = newEmployees.length > 0 || modifiedEmployees.length > 0 || terminatedEmployees.length > 0 || unmatchedEmployees.length > 0;

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

    return (
      <Box>
        {/* Unmatched Employees Accordion (black styling) */}
        {unmatchedEmployees.length > 0 && (
          <Accordion
            defaultExpanded={true}
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
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: '#000000' }} />}
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
              <Typography sx={{ fontFamily, fontSize: 18, fontWeight: 600, color: '#000000' }}>
                Unmatched Employees
              </Typography>
              <Typography sx={{ fontFamily, fontSize: 14, color: '#6b7280', ml: 1 }}>
                {unmatchedEmployees.length > 0 ? `${unmatchedEmployees.length} employees` : 'No employees'}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ padding: 0, overflow: 'visible' }}>
              <Box sx={{ p: 2 }}>
                <Box sx={{ 
                  borderRadius: '16px',
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#ffffff",
                  overflow: "hidden",
                  boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.04)",
                }}>
                  {/* Table Headers */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2, 
                    p: 2, 
                    borderBottom: '2px solid #e5e7eb',
                    backgroundColor: '#f9fafb',
                  }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 600, color: '#111827', textAlign: 'center' }}>
                        HR/Payroll Name
                      </Typography>
                    </Box>
                    <Box sx={{ width: 24 }} /> {/* Spacer for arrow */}
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 600, color: '#111827', textAlign: 'center' }}>
                        Employee
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    {unmatchedEmployees.map((emp: any, idx: number) => {
                      // Pre-select suggested match if available and not already manually selected
                      const currentSelection = unmatchedMappings[emp.payroll_name] !== undefined 
                        ? unmatchedMappings[emp.payroll_name] 
                        : (emp.suggested_match_id || '');
                      
                      // Check if this employee ID is already selected by another payroll name
                      const isDuplicate = currentSelection && currentSelection !== '' && 
                        Object.entries(unmatchedMappings).some(([payrollName, employeeId]) => 
                          payrollName !== emp.payroll_name && employeeId === currentSelection
                        );
                      
                      return (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, pb: 2, borderBottom: idx < unmatchedEmployees.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 600, color: '#111827' }}>
                              {emp.payroll_name}
                            </Typography>
                          </Box>
                          <ArrowForwardIcon sx={{ color: '#6b7280', fontSize: 20 }} />
                          <FormControl size="small" sx={{ flex: 1, minWidth: 200 }} error={isDuplicate}>
                            <Select
                              value={currentSelection}
                              onChange={(e: SelectChangeEvent<string>) => {
                                const newEmployeeId = e.target.value || null;
                                
                                // Check if this employee is already selected elsewhere
                                const isAlreadySelected = newEmployeeId && 
                                  Object.entries(unmatchedMappings).some(([payrollName, employeeId]) => 
                                    payrollName !== emp.payroll_name && employeeId === newEmployeeId
                                  );
                                
                                if (isAlreadySelected) {
                                  // Don't update if duplicate, but show error
                                  return;
                                }
                                
                                setUnmatchedMappings(prev => ({
                                  ...prev,
                                  [emp.payroll_name]: newEmployeeId,
                                }));
                              }}
                              displayEmpty
                              renderValue={(value) => {
                                if (!value || value === '') {
                                  return (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <AddIcon sx={{ fontSize: 18, color: levelsetGreen }} />
                                      <span style={{ fontFamily, fontSize: 13, fontWeight: 600, color: levelsetGreen }}>New Employee</span>
                                    </Box>
                                  );
                                }
                                const selectedEmployee = allEmployees.find(emp => emp.id === value);
                                return selectedEmployee ? (selectedEmployee.full_name || `${selectedEmployee.first_name} ${selectedEmployee.last_name}`) : '';
                              }}
                              sx={{
                                fontFamily,
                                fontSize: 13,
                                '& .MuiSelect-select': {
                                  padding: '8px 32px 8px 12px',
                                },
                                '&.Mui-error': {
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#dc2626',
                                  },
                                },
                              }}
                            >
                              <MenuItem value="" sx={{ fontFamily, fontSize: 13, fontWeight: 600 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <AddIcon sx={{ fontSize: 18, color: levelsetGreen }} />
                                  <span style={{ color: levelsetGreen }}>New Employee</span>
                                </Box>
                              </MenuItem>
                              {allEmployees.map(employee => {
                                // Check if this employee is already selected
                                const isSelected = Object.entries(unmatchedMappings).some(([payrollName, employeeId]) => 
                                  payrollName !== emp.payroll_name && employeeId === employee.id
                                );
                                return (
                                  <MenuItem 
                                    key={employee.id} 
                                    value={employee.id} 
                                    disabled={isSelected}
                                    sx={{ 
                                      fontFamily, 
                                      fontSize: 13,
                                      '&.Mui-disabled': {
                                        opacity: 0.5,
                                      },
                                    }}
                                  >
                                    {employee.full_name || `${employee.first_name} ${employee.last_name}`}
                                    {isSelected && ' (already selected)'}
                                  </MenuItem>
                                );
                              })}
                            </Select>
                            {isDuplicate && (
                              <Typography sx={{ fontFamily, fontSize: 12, color: '#dc2626', mt: 0.5 }}>
                                Employee already selected
                              </Typography>
                            )}
                          </FormControl>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

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
          <AccordionDetails sx={{ padding: 0, overflow: 'visible' }}>
            {newEmployeesData.length > 0 && currentPage === 'review' && notification !== null && (
              <Box sx={{ p: 2, overflow: 'visible' }}>
                <Box sx={{ 
                  height: 400, 
                  width: '100%',
                  borderRadius: '16px',
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#ffffff",
                  overflow: "hidden",
                  boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.04)",
                }}>
                  <DataGridPro
                    rows={newEmployeesData}
                    columns={newEmployeeColumns}
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
                        borderBottom: '1px solid #f3f4f6',
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#111827',
                        cursor: 'default',
                        '&:focus': {
                          outline: 'none',
                        },
                      },
                      '& .MuiDataGrid-row': {
                        cursor: 'default',
                        '&:hover': {
                          backgroundColor: 'transparent',
                        },
                      },
                      '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: '#f9fafb',
                        borderBottom: '2px solid #e5e7eb',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#111827',
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
              {modifiedEmployees.length > 0 ? `${modifiedEmployees.length} employees` : 'No employees'}
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
          <AccordionDetails sx={{ padding: 0, overflow: 'visible' }}>
            {terminatedEmployeesData.length > 0 && currentPage === 'review' && notification !== null && (
              <Box sx={{ p: 2, overflow: 'visible' }}>
                <Box sx={{ 
                  height: 400, 
                  width: '100%',
                  borderRadius: '16px',
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#ffffff",
                  overflow: "hidden",
                  boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.04)",
                }}>
                  <DataGridPro
                    rows={terminatedEmployeesData}
                    columns={terminatedColumns}
                    disableRowSelectionOnClick
                    hideFooter
                    rowHeight={48}
                    columnHeaderHeight={56}
                    getRowClassName={(params) => 
                      keptEmployees.has(params.row.id) ? '' : 'terminated-row'
                    }
                    sx={{
                      fontFamily,
                      border: "none",
                      borderRadius: '16px',
                      overflow: 'hidden',
                      '& .MuiDataGrid-cell': {
                        borderBottom: '1px solid #f3f4f6',
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#111827',
                        cursor: 'default',
                        '&:focus': {
                          outline: 'none',
                        },
                      },
                      '& .MuiDataGrid-row': {
                        cursor: 'default',
                        '&:hover': {
                          backgroundColor: 'transparent',
                        },
                      },
                      '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: '#f9fafb',
                        borderBottom: '2px solid #e5e7eb',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#111827',
                      },
                      '& .terminated-row': {
                        backgroundColor: '#fee2e2 !important',
                        '& .MuiDataGrid-cell': {
                          backgroundColor: '#fee2e2 !important',
                        },
                      },
                    }}
                  />
                </Box>
                {Array.from(keptEmployees).map(empId => {
                  const emp = terminatedEmployeesData.find(e => e.id === empId);
                  if (!emp) return null;
                  return (
                    <Box key={empId} sx={{ mt: 2, p: 2, backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                      <Typography sx={{ fontFamily, fontSize: 12, color: '#6b7280' }}>
                        {emp.first_name} {emp.last_name} will be kept on your Levelset roster. This has no impact on their status in HotSchedules or HR/Payroll.
                      </Typography>
                    </Box>
                  );
                })}
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
              borderRadius: '8px',
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
              Sync Employees from HR/Payroll Report
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
          {currentPage === 'review' && processing && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CircularProgress sx={{ color: levelsetGreen, mb: 2 }} />
              <Typography sx={{ fontFamily, fontSize: 16, color: '#6b7280' }}>
                Processing file...
              </Typography>
            </Box>
          )}
          {currentPage === 'review' && !processing && notification && renderReviewPage()}
          {currentPage === 'confirmation' && confirmationStats && (
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
                  borderRadius: '8px',
                  '&:hover': {
                    backgroundColor: '#2d5a42',
                  },
                }}
              >
                Back to Roster
              </Button>
            </Box>
          )}
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
          Are you sure you want to exit your HR/Payroll sync?
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
              borderRadius: '8px',
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
              borderRadius: '8px',
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

