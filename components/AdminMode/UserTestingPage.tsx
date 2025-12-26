/**
 * UserTestingPage
 * Allows Levelset Admins to view all users and impersonate them for testing
 */

import * as React from 'react';
import { styled } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import LoginIcon from '@mui/icons-material/Login';
import { createSupabaseClient } from '@/util/supabase/component';
import { useImpersonation } from '@/lib/providers/ImpersonationProvider';
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

const StyledFormControl = styled(FormControl)(() => ({
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
  '& .MuiInputLabel-root': {
    fontFamily,
    fontSize: 14,
    '&.Mui-focused': {
      color: '#31664a',
    },
  },
}));

interface AppUserRaw {
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
  hire_date?: string;
  active: boolean;
  orgs: { id: string; name: string } | null;
  locations: { id: string; location_number: string } | null;
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
  hire_date?: string;
  active: boolean;
  orgs?: { id: string; name: string } | null;
  locations?: { id: string; location_number: string } | null;
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
  const supabase = React.useMemo(() => createSupabaseClient(), []);
  const { isImpersonating, impersonatedUser, startImpersonation } = useImpersonation();

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

  // Fetch organizations
  React.useEffect(() => {
    async function fetchOrgs() {
      const { data } = await supabase
        .from('orgs')
        .select('id, name')
        .order('name');
      
      if (data) {
        setOrgs(data);
      }
    }
    fetchOrgs();
  }, [supabase]);

  // Fetch locations
  React.useEffect(() => {
    async function fetchLocations() {
      const { data } = await supabase
        .from('locations')
        .select('id, location_number, org_id')
        .order('location_number');
      
      if (data) {
        setLocations(data);
        setFilteredLocations(data);
      }
    }
    fetchLocations();
  }, [supabase]);

  // Filter locations when org changes
  React.useEffect(() => {
    if (selectedOrg) {
      setFilteredLocations(locations.filter(loc => loc.org_id === selectedOrg));
      setSelectedLocation(''); // Reset location when org changes
    } else {
      setFilteredLocations(locations);
    }
  }, [selectedOrg, locations]);

  // Fetch users
  React.useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      
      let query = supabase
        .from('app_users')
        .select(`
          id,
          auth_user_id,
          email,
          first_name,
          last_name,
          full_name,
          role,
          org_id,
          location_id,
          employee_id,
          hire_date,
          active,
          orgs (id, name),
          locations (id, location_number)
        `)
        .order('full_name');

      // Apply org filter
      if (selectedOrg) {
        query = query.eq('org_id', selectedOrg);
      }

      // Apply location filter
      if (selectedLocation) {
        query = query.eq('location_id', selectedLocation);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching users:', error);
      } else {
        // Cast the data to handle Supabase's type inference for joins
        setUsers((data as AppUserRaw[] | null) || []);
      }
      
      setLoading(false);
    }

    fetchUsers();
  }, [supabase, selectedOrg, selectedLocation]);

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
  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
        
        <StyledFormControl size="small" className={styles.filterField}>
          <InputLabel>Organization</InputLabel>
          <Select
            value={selectedOrg}
            label="Organization"
            onChange={(e) => setSelectedOrg(e.target.value)}
          >
            <MenuItem value="">
              <em>All Organizations</em>
            </MenuItem>
            {orgs.map(org => (
              <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
            ))}
          </Select>
        </StyledFormControl>

        <StyledFormControl size="small" className={styles.filterField}>
          <InputLabel>Location</InputLabel>
          <Select
            value={selectedLocation}
            label="Location"
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <MenuItem value="">
              <em>All Locations</em>
            </MenuItem>
            {filteredLocations.map(loc => (
              <MenuItem key={loc.id} value={loc.id}>#{loc.location_number}</MenuItem>
            ))}
          </Select>
        </StyledFormControl>
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
                  <th className={styles.tableHeaderCell}>Location</th>
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
                          sx={{ fontSize: 18, marginRight: 1, verticalAlign: 'middle' }}
                        />
                        {user.full_name || `${user.first_name} ${user.last_name}`}
                      </td>
                      <td className={`${styles.tableCell} ${styles.tableCellEmail}`}>{user.email}</td>
                      <td className={`${styles.tableCell} ${styles.tableCellOrg}`}>
                        {user.orgs?.name || '—'}
                      </td>
                      <td className={`${styles.tableCell} ${styles.tableCellLocation}`}>
                        {user.locations?.location_number ? `#${user.locations.location_number}` : '—'}
                      </td>
                      <td className={styles.tableCell}>
                        <span className={styles.tableCellRole}>{user.role || '—'}</span>
                      </td>
                      <td className={`${styles.tableCell} ${styles.tableCellActions}`}>
                        <button
                          className={styles.loginAsButton}
                          onClick={(e) => handleLoginAs(user.id, e)}
                          disabled={impersonationLoading === user.id || (isImpersonating && impersonatedUser?.id !== user.id)}
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
                              <span className={styles.detailValue}>{user.first_name || '—'}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Last Name</span>
                              <span className={styles.detailValue}>{user.last_name || '—'}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Email</span>
                              <span className={styles.detailValue}>{user.email || '—'}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Employee ID</span>
                              <span className={styles.detailValue}>{user.employee_id || '—'}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Start Date</span>
                              <span className={styles.detailValue}>{formatDate(user.hire_date)}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Role</span>
                              <span className={styles.detailValue}>{user.role || '—'}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Active</span>
                              <span className={styles.detailValue}>{user.active ? 'Yes' : 'No'}</span>
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
