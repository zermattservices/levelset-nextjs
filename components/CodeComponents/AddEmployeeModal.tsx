"use client";

import * as React from "react";
import {
  Dialog,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Menu,
  MenuItem,
  Checkbox,
  Grid,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { createSupabaseClient } from "@/util/supabase/component";
import type { Employee, AvailabilityType } from "@/lib/supabase.types";
import { RolePill } from "./shared/RolePill";
import { Role } from "./RosterTable";

export interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (employee: Employee) => void;
  locationId: string;
  onEmployeeCreated?: () => void;
  className?: string;
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a';

// Custom TextField matching AddInfractionModal
const CustomTextField = React.forwardRef((props: any, ref: any) => (
  <TextField
    {...props}
    ref={ref}
    fullWidth
    size="small"
    sx={{
      '& .MuiInputLabel-root': {
        fontFamily,
        fontSize: 12,
        color: '#6b7280',
        '&.Mui-focused': {
          color: levelsetGreen,
        },
      },
      '& .MuiInputBase-root': {
        fontFamily,
        fontSize: 14,
      },
      '& .MuiInputBase-input': {
        fontFamily,
        fontSize: 14,
        padding: '10px 14px',
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: '#e5e7eb',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: '#d1d5db',
      },
      '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: levelsetGreen,
        borderWidth: '2px',
      },
      ...props.sx,
    }}
  />
));

// BrandCheckbox matching RosterTable
const BrandCheckbox = styled(Checkbox)(() => ({
  color: "#9ca3af",
  padding: 0,
  "&.Mui-checked": {
    color: levelsetGreen,
  },
  "&:hover": {
    backgroundColor: "rgba(49, 102, 74, 0.08)",
  },
}));

// AvailabilityChip matching RosterTable
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
  fontFamily,
  cursor: "pointer",
  transition: "all 0.15s ease-in-out",
  backgroundColor: "#f3f4f6",
  color: "#111827",
  "&:hover": {
    opacity: 0.9,
    transform: "translateY(-1px)",
  },
  "& svg": {
    fontSize: 16,
  },
  "&.available": {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  "&.limited": {
    backgroundColor: "#fef3c7",
    color: "#d97706",
  },
}));

// RoleMenuItem matching RosterTable
const RoleMenuItem = styled(MenuItem)(() => ({
  fontFamily,
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

export function AddEmployeeModal({
  open,
  onClose,
  onSave,
  locationId,
  onEmployeeCreated,
  className = "",
}: AddEmployeeModalProps) {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [isFoh, setIsFoh] = React.useState(false);
  const [isBoh, setIsBoh] = React.useState(false);
  const [role, setRole] = React.useState<Role>("Team Member");
  const [availability, setAvailability] = React.useState<AvailabilityType>("Available");
  const [roleMenuAnchor, setRoleMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [availabilityMenuAnchor, setAvailabilityMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const supabase = createSupabaseClient();

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      setFirstName("");
      setLastName("");
      setIsFoh(false);
      setIsBoh(false);
      setRole("Team Member");
      setAvailability("Available");
      setRoleMenuAnchor(null);
      setAvailabilityMenuAnchor(null);
      setError(null);
    }
  }, [open]);

  const handleRoleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setRoleMenuAnchor(event.currentTarget);
  };

  const handleRoleMenuClose = () => {
    setRoleMenuAnchor(null);
  };

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    handleRoleMenuClose();
  };

  const handleAvailabilityMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAvailabilityMenuAnchor(event.currentTarget);
  };

  const handleAvailabilityMenuClose = () => {
    setAvailabilityMenuAnchor(null);
  };

  const handleAvailabilitySelect = (selectedAvailability: AvailabilityType) => {
    setAvailability(selectedAvailability);
    handleAvailabilityMenuClose();
  };

  const handleSubmit = async () => {
    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required");
      return;
    }

    if (!isFoh && !isBoh) {
      setError("At least one of FOH or BOH must be selected");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      // Fetch org_id from locations table
      const { data: locData, error: locError } = await supabase
        .from('locations')
        .select('org_id')
        .eq('id', locationId)
        .single();

      if (locError || !locData) {
        throw new Error('Failed to fetch location information');
      }

      const orgId = locData.org_id;
      if (!orgId) {
        throw new Error('Location does not have an organization ID');
      }

      // Create employee
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const employeeData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: fullName,
        role,
        availability,
        is_foh: isFoh,
        is_boh: isBoh,
        location_id: locationId,
        org_id: orgId,
        active: true,
        certified_status: 'Not Certified' as const,
      };

      // Call API to create employee
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'create',
          ...employeeData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create employee');
      }

      const { employee } = await response.json();
      
      onSave?.(employee);
      onEmployeeCreated?.();
      onClose();
    } catch (err) {
      console.error('Error creating employee:', err);
      setError(err instanceof Error ? err.message : 'Failed to create employee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          fontFamily,
        },
      }}
      className={className}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px",
          borderBottom: "1px solid #e9eaeb",
        }}
      >
        <Typography
          sx={{
            fontFamily,
            fontSize: "20px",
            fontWeight: 600,
            color: "#181d27",
          }}
        >
          Add Employee
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            color: "#6b7280",
            "&:hover": {
              backgroundColor: "#f3f4f6",
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ p: 3 }}>
        {error && (
          <Typography
            sx={{
              fontFamily,
              fontSize: 14,
              color: "#dc2626",
              mb: 2,
            }}
          >
            {error}
          </Typography>
        )}

        <Stack spacing={3}>
          {/* First Name and Last Name in one row */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <CustomTextField
                label="First Name"
                value={firstName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <CustomTextField
                label="Last Name"
                value={lastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                required
                fullWidth
              />
            </Grid>
          </Grid>

          <Box>
            <Typography
              sx={{
                fontFamily,
                fontSize: 12,
                fontWeight: 500,
                color: "#6b7280",
                mb: 1,
              }}
            >
              Areas
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BrandCheckbox
                  checked={isFoh}
                  onChange={(_, checked) => setIsFoh(checked)}
                />
                <Typography sx={{ fontFamily, fontSize: 14 }}>FOH</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BrandCheckbox
                  checked={isBoh}
                  onChange={(_, checked) => setIsBoh(checked)}
                />
                <Typography sx={{ fontFamily, fontSize: 14 }}>BOH</Typography>
              </Box>
            </Box>
          </Box>

          {/* Role and Availability in one row */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box>
                <Typography
                  sx={{
                    fontFamily,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#6b7280",
                    mb: 1,
                  }}
                >
                  Role
                </Typography>
                <Box>
                  <RolePill
                    role={role}
                    endIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: "#6b7280" }} />}
                    onClick={handleRoleMenuOpen}
                  />
                  <Menu
                    anchorEl={roleMenuAnchor}
                    open={Boolean(roleMenuAnchor)}
                    onClose={handleRoleMenuClose}
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
                    {(["New Hire", "Team Member", "Trainer", "Team Lead", "Director"] as Role[]).map((roleOption) => (
                      <RoleMenuItem
                        key={roleOption}
                        selected={role === roleOption}
                        onClick={() => handleRoleSelect(roleOption)}
                      >
                        <RolePill role={roleOption} />
                      </RoleMenuItem>
                    ))}
                  </Menu>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box>
                <Typography
                  sx={{
                    fontFamily,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#6b7280",
                    mb: 1,
                  }}
                >
                  Availability
                </Typography>
                <Box>
                  <AvailabilityChip
                    className={availability.toLowerCase()}
                    onClick={handleAvailabilityMenuOpen}
                  >
                    {availability}
                    <ExpandMoreIcon sx={{ fontSize: 14, ml: 0.5 }} />
                  </AvailabilityChip>
                  <Menu
                    anchorEl={availabilityMenuAnchor}
                    open={Boolean(availabilityMenuAnchor)}
                    onClose={handleAvailabilityMenuClose}
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
                    {(["Available", "Limited"] as AvailabilityType[]).map((option) => (
                      <RoleMenuItem
                        key={option}
                        selected={availability === option}
                        onClick={() => handleAvailabilitySelect(option)}
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
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Stack>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
          padding: "16px 24px",
          borderTop: "1px solid #e9eaeb",
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            fontFamily,
            fontSize: 14,
            fontWeight: 500,
            textTransform: "none",
            color: "#6b7280",
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          variant="contained"
          sx={{
            fontFamily,
            fontSize: 14,
            fontWeight: 500,
            textTransform: "none",
            backgroundColor: levelsetGreen,
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "#2d5a42",
            },
            "&:disabled": {
              backgroundColor: "#9ca3af",
            },
          }}
        >
          {saving ? "Creating..." : "Add Employee"}
        </Button>
      </Box>
    </Dialog>
  );
}

