/**
 * UserTestingPage
 * Allows Levelset Admins to view all users and impersonate them for testing
 */

import * as React from 'react';
import { styled } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import LoginIcon from '@mui/icons-material/Login';
import { useImpersonation } from '@/lib/providers/ImpersonationProvider';
import { useAuth } from '@/lib/providers/AuthProvider';
import styles from './UserTestingPage.module.css';

const fontFamily = '"Satoshi", sans-serif';

const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    fontFamily,
    fontSize: 14,
    backgroundColor: '#ffffff',
    '&:hover fieldset': {
      borderColor: '#31664a',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#31664a',
    },
  },
}));

const StyledSelect = styled(Select)(() => ({
  fontFamily,
  fontSize: 14,
  backgroundColor: '#ffffff',
  '& .MuiSelect-select': {
    display: 'flex',
    alignItems: 'center',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#31664a',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#31664a',
  },
}));

interface LocationObj {
  id: string;
  location_number: string;
  org_id?: string;
}

interface AppUser {
  id: string;
  auth_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  org_id: string;
  location_id: string;
  employee_id?: string;
  display_employee_id?: string | null;
  hire_date?: string;
  active: boolean;
  orgs?: { id: string; name: string } | null;
  locations?: LocationObj[];
  location_access?: string[];
  last_login?: string | null;
  last_hs_sync?: string | null;
  hs_id?: string | null;
}

interface Org {
  id: string;
  name: string;
}

interface Location {
  id: string;
  location_number: string;
  org_id: string;
}

const PAGE_SIZE = 15;

export function UserTestingPage() {
  const { isImpersonating, impersonatedUser, startImpersonation } = useImpersonation();
  const auth = useAuth();

  // State
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [orgs, setOrgs] = React.useState<Org[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = React.useState<Location[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedOrg, setSelectedOrg] = React.useState<string>('');
  const [selectedLocation, setSelectedLocation] = React.useState<string>('');
  const [expandedUserId, setExpandedUserId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [impersonationLoading, setImpersonationLoading] = React.useState<string | null>(null);

  // Get current user's auth_user_id
  const currentAuthUserId = auth.authUser?.id;

  // Fetch all data from admin API (bypasses RLS)
  React.useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      try {
        // Build query params
        const params = new URLSearchParams();
        if (selectedOrg) params.append('org_id', selectedOrg);
        if (selectedLocation) params.append('location_id', selectedLocation);
        
        const response = await fetch(`/api/admin/users?${params.toString()}`);
        const data = await response.json();
        
        if (response.ok) {
          setUsers(data.users || []);
          // Only set orgs/locations on first load (no filters)
          if (!selectedOrg && !selectedLocation) {
            setOrgs(data.orgs || []);
            setLocations(data.locations || []);
            setFilteredLocations(data.locations || []);
          }
        } else {
          console.error('Error fetching users:', data.error);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
      
      setLoading(false);
    }

    fetchData();
  }, [selectedOrg, selectedLocation]);

  // Filter locations when org changes
  React.useEffect(() => {
    if (selectedOrg) {
      setFilteredLocations(locations.filter(loc => loc.org_id === selectedOrg));
      setSelectedLocation(''); // Reset location when org changes
    } else {
      setFilteredLocations(locations);
    }
  }, [selectedOrg, locations]);

  // Filter users by search query
  const filteredUsers = React.useMemo(() => {
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      (user.full_name?.toLowerCase().includes(query)) ||
      (user.email?.toLowerCase().includes(query)) ||
      (user.first_name?.toLowerCase().includes(query)) ||
      (user.last_name?.toLowerCase().includes(query))
    );
  }, [users, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedOrg, selectedLocation]);

  // Handle row click to expand/collapse
  const handleRowClick = (userId: string) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  // Handle impersonation
  const handleLoginAs = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row expansion
    
    setImpersonationLoading(userId);
    const success = await startImpersonation(userId);
    setImpersonationLoading(null);
    
    if (success) {
      // Redirect to home page as the impersonated user
      window.location.href = '/';
    }
  };

  // Format date for display
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format datetime for display
  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Get organization display name
  const getOrgDisplayName = (user: AppUser): string => {
    if (user.role === 'Levelset Admin') {
      return 'Levelset';
    }
    return user.orgs?.name || '—';
  };

  // Render location pills with +X for overflow
  const renderLocationPills = (user: AppUser) => {
    const locs = user.locations || [];
    
    if (locs.length === 0) {
      return <span className={styles.noLocations}>—</span>;
    }

    const maxVisible = 2;
    const visibleLocs = locs.slice(0, maxVisible);
    const hiddenLocs = locs.slice(maxVisible);
    const hiddenCount = hiddenLocs.length;

    return (
      <div className={styles.locationPillsContainer}>
        {visibleLocs.map(loc => (
          <span key={loc.id} className={styles.locationPill}>
            {loc.location_number}
          </span>
        ))}
        {hiddenCount > 0 && (
          <Tooltip
            title={
              <div className={styles.tooltipContent}>
                {hiddenLocs.map(loc => (
                  <span key={loc.id}>{loc.location_number}</span>
                ))}
              </div>
            }
            arrow
            placement="top"
          >
            <span className={styles.locationPillMore}>
              +{hiddenCount}
            </span>
          </Tooltip>
        )}
      </div>
    );
  };

  // Check if this is the current user
  const isCurrentUser = (user: AppUser): boolean => {
    return user.auth_user_id === currentAuthUserId;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.intro}>
        <h2 className={styles.title}>User Testing</h2>
        <p className={styles.description}>
          View all users and log in as them to test their experience. Filter by organization or location to find specific users.
        </p>
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <StyledTextField
          className={styles.searchField}
          placeholder="Search by name or email..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#9ca3af', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />
        
        <StyledSelect
          size="small"
          value={selectedOrg}
          onChange={(e) => setSelectedOrg(e.target.value as string)}
          displayEmpty
          sx={{ minWidth: 200 }}
          renderValue={(value): React.ReactNode => {
            if (!value) {
              return <span style={{ color: '#9ca3af' }}>Organization</span>;
            }
            const org = orgs.find(o => o.id === value);
            return org?.name || String(value);
          }}
        >
          <MenuItem value="">
            <em>All Organizations</em>
          </MenuItem>
          {orgs.map(org => (
            <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
          ))}
        </StyledSelect>

        <StyledSelect
          size="small"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value as string)}
          displayEmpty
          sx={{ minWidth: 180 }}
          renderValue={(value): React.ReactNode => {
            if (!value) {
              return <span style={{ color: '#9ca3af' }}>Location</span>;
            }
            const loc = filteredLocations.find(l => l.id === value);
            return loc ? `#${loc.location_number}` : String(value);
          }}
        >
          <MenuItem value="">
            <em>All Locations</em>
          </MenuItem>
          {filteredLocations.map(loc => (
            <MenuItem key={loc.id} value={loc.id}>#{loc.location_number}</MenuItem>
          ))}
        </StyledSelect>
      </div>

      {/* Users table */}
      {loading ? (
          <div className={styles.loadingContainer}>
            <CircularProgress size={32} sx={{ color: '#31664a' }} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className={styles.emptyState}>
            <PersonSearchIcon className={styles.emptyStateIcon} sx={{ fontSize: 48 }} />
            <p className={styles.emptyStateText}>
              {searchQuery || selectedOrg || selectedLocation
                ? 'No users found matching your filters.'
                : 'No users found.'}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead className={styles.tableHeader}>
                  <tr>
                    <th className={styles.tableHeaderCell}>Name</th>
                    <th className={styles.tableHeaderCell}>Email</th>
                    <th className={styles.tableHeaderCell}>Organization</th>
                    <th className={styles.tableHeaderCell}>Locations</th>
                    <th className={styles.tableHeaderCell}>Role</th>
                    <th className={styles.tableHeaderCell}></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map(user => (
                    <React.Fragment key={user.id}>
                      <tr 
                        className={`${styles.tableRow} ${expandedUserId === user.id ? styles.tableRowExpanded : ''}`}
                        onClick={() => handleRowClick(user.id)}
                      >
                        <td className={`${styles.tableCell} ${styles.tableCellName}`}>
                          <KeyboardArrowDownIcon 
                            className={`${styles.expandIcon} ${expandedUserId === user.id ? styles.expandIconRotated : ''}`}
                            sx={{ fontSize: 18, flexShrink: 0 }}
                          />
                          <span className={styles.nameText}>
                            {user.full_name || `${user.first_name} ${user.last_name}`}
                          </span>
                        </td>
                        <td className={`${styles.tableCell} ${styles.tableCellEmail}`}>{user.email}</td>
                        <td className={`${styles.tableCell} ${styles.tableCellOrg}`}>
                          {getOrgDisplayName(user)}
                        </td>
                        <td className={`${styles.tableCell} ${styles.tableCellLocation}`}>
                          {renderLocationPills(user)}
                        </td>
                        <td className={styles.tableCell}>
                          <span className={styles.tableCellRole}>{user.role || '—'}</span>
                        </td>
                        <td className={`${styles.tableCell} ${styles.tableCellActions}`}>
                          <button
                            className={styles.loginAsButton}
                            onClick={(e) => handleLoginAs(user.id, e)}
                            disabled={
                              impersonationLoading === user.id || 
                              (isImpersonating && impersonatedUser?.id !== user.id) ||
                              isCurrentUser(user)
                            }
                            title={isCurrentUser(user) ? "You cannot log in as yourself" : undefined}
                          >
                            {impersonationLoading === user.id ? (
                              <CircularProgress size={14} sx={{ color: '#ffffff' }} />
                            ) : (
                              <>
                                <LoginIcon sx={{ fontSize: 16 }} />
                                Log In As
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                      {expandedUserId === user.id && (
                        <tr className={styles.expandedContent}>
                          <td colSpan={6}>
                            <div className={styles.expandedInner}>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>First Name</span>
                                <span className={styles.detailValue}>{user.first_name || 'N/A'}</span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Last Name</span>
                                <span className={styles.detailValue}>{user.last_name || 'N/A'}</span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Email</span>
                                <span className={styles.detailValue}>{user.email || 'N/A'}</span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Employee ID</span>
                                <span className={styles.detailValue}>{user.display_employee_id || 'N/A'}</span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Created</span>
                                <span className={styles.detailValue}>{formatDate(user.hire_date)}</span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Role</span>
                                <span className={styles.detailValue}>{user.role || 'N/A'}</span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Last Logged In</span>
                                <span className={styles.detailValue}>{formatDateTime(user.last_login)}</span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Last HS Synced</span>
                                <span className={styles.detailValue}>{formatDateTime(user.last_hs_sync)}</span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>User ID</span>
                                <span className={styles.detailValue} style={{ fontSize: 12, fontFamily: 'monospace' }}>
                                  {user.id}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <span className={styles.paginationInfo}>
                Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length} users
              </span>
              <div className={styles.paginationButtons}>
                <button
                  className={styles.paginationButton}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <KeyboardArrowLeftIcon sx={{ fontSize: 20 }} />
                </button>
                <button
                  className={styles.paginationButton}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <KeyboardArrowRightIcon sx={{ fontSize: 20 }} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default UserTestingPage;
