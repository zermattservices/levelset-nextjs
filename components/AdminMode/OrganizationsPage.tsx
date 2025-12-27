/**
 * OrganizationsPage
 * Admin page for managing all organizations in Levelset
 */

import * as React from 'react';
import { CircularProgress, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { createSupabaseClient } from '@/util/supabase/component';
import { OrganizationModal } from './OrganizationModal';
import styles from './OrganizationsPage.module.css';

interface Location {
  id: string;
  location_number: string;
  org_id: string;
}

interface Organization {
  id: string;
  name: string;
  created_at: string;
  start_date: string | null;
  subscription_plan: string | null;
  locations: Location[];
  employee_count: number;
  state: string | null;
  operator_name: string | null;
}

export function OrganizationsPage() {
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedOrg, setSelectedOrg] = React.useState<Organization | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch organizations with locations, employee counts, and state from CFA locations
  React.useEffect(() => {
    async function fetchOrganizations() {
      setLoading(true);
      try {
        // Fetch all organizations
        const { data: orgsData, error: orgsError } = await supabase
          .from('orgs')
          .select('id, name, created_at, start_date, subscription_plan')
          .order('name');

        if (orgsError) throw orgsError;

        // Fetch all locations
        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('id, location_number, org_id')
          .order('location_number');

        if (locationsError) throw locationsError;

        // Fetch employee counts per org
        const { data: employeesData, error: employeesError } = await supabase
          .from('employees')
          .select('org_id, id')
          .eq('active', true);

        if (employeesError) throw employeesError;

        // Fetch CFA location data for state lookup
        const { data: cfaLocationsData, error: cfaError } = await supabase
          .from('cfa_locations')
          .select('location_num, operator, state');

        if (cfaError) {
          console.error('Error fetching CFA locations:', cfaError);
        }

        // Create lookup maps
        const locationsByOrg = new Map<string, Location[]>();
        for (const loc of locationsData || []) {
          const existing = locationsByOrg.get(loc.org_id) || [];
          existing.push(loc);
          locationsByOrg.set(loc.org_id, existing);
        }

        const employeeCountByOrg = new Map<string, number>();
        for (const emp of employeesData || []) {
          if (emp.org_id) {
            employeeCountByOrg.set(emp.org_id, (employeeCountByOrg.get(emp.org_id) || 0) + 1);
          }
        }

        // Create CFA location lookup by location_num
        const cfaLocationMap = new Map<string, { operator: string; state: string }>();
        for (const cfa of cfaLocationsData || []) {
          if (cfa.location_num) {
            cfaLocationMap.set(cfa.location_num, { operator: cfa.operator, state: cfa.state });
          }
        }

        // Build organization data with enriched info
        const enrichedOrgs: Organization[] = (orgsData || []).map(org => {
          const locations = locationsByOrg.get(org.id) || [];
          const employeeCount = employeeCountByOrg.get(org.id) || 0;
          
          // Look up state and operator from CFA locations using first location number
          let state: string | null = null;
          let operatorName: string | null = null;
          
          if (locations.length > 0) {
            const firstLocationNum = locations[0].location_number;
            const cfaData = cfaLocationMap.get(firstLocationNum);
            if (cfaData) {
              state = cfaData.state;
              operatorName = cfaData.operator;
            }
          }

          return {
            id: org.id,
            name: org.name,
            created_at: org.created_at,
            start_date: org.start_date,
            subscription_plan: org.subscription_plan,
            locations,
            employee_count: employeeCount,
            state,
            operator_name: operatorName,
          };
        });

        setOrganizations(enrichedOrgs);
      } catch (err) {
        console.error('Error fetching organizations:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrganizations();
  }, [supabase]);

  // Filter organizations by search query
  const filteredOrgs = React.useMemo(() => {
    if (!searchQuery) return organizations;
    const query = searchQuery.toLowerCase();
    return organizations.filter(org => 
      org.name.toLowerCase().includes(query) ||
      org.operator_name?.toLowerCase().includes(query) ||
      org.locations.some(loc => loc.location_number.includes(query))
    );
  }, [organizations, searchQuery]);

  // Handle row click to open modal
  const handleRowClick = (org: Organization) => {
    setSelectedOrg(org);
    setModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedOrg(null);
  };

  // Format date for display
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '--';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '--';
    }
  };

  // Render location pills
  const renderLocationPills = (locations: Location[]) => {
    if (locations.length === 0) {
      return <span className={styles.noLocations}>--</span>;
    }

    const maxVisible = 2;
    const visibleLocs = locations.slice(0, maxVisible);
    const hiddenCount = locations.length - maxVisible;

    return (
      <div className={styles.locationPillsContainer}>
        {visibleLocs.map(loc => (
          <span key={loc.id} className={styles.locationPill}>
            {loc.location_number}
          </span>
        ))}
        {hiddenCount > 0 && (
          <span className={styles.locationPillMore} title={locations.slice(maxVisible).map(l => l.location_number).join(', ')}>
            +{hiddenCount}
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress size={40} sx={{ color: '#31664a' }} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.intro}>
        <h2 className={styles.title}>Organizations</h2>
        <p className={styles.description}>
          View and manage all organizations using Levelset.
        </p>
      </div>

      {/* Search */}
      <div className={styles.filterBar}>
        <TextField
          placeholder="Search organizations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          className={styles.searchField}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#9ca3af', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              fontFamily: '"Satoshi", sans-serif',
              fontSize: 14,
              borderRadius: '8px',
              '&:hover fieldset': { borderColor: '#31664a' },
              '&.Mui-focused fieldset': { borderColor: '#31664a' },
            },
          }}
        />
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHeader}>
              <th className={styles.tableHeaderCell}>Organization</th>
              <th className={styles.tableHeaderCell}>Locations</th>
              <th className={styles.tableHeaderCell}>Start Date</th>
              <th className={styles.tableHeaderCell}>State</th>
              <th className={styles.tableHeaderCell}>Plan</th>
              <th className={styles.tableHeaderCell}>Employees</th>
              <th className={styles.tableHeaderCell}>Usage</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrgs.map(org => (
              <tr 
                key={org.id} 
                className={styles.tableRow}
                onClick={() => handleRowClick(org)}
              >
                <td className={`${styles.tableCell} ${styles.tableCellName}`}>
                  {org.name}
                </td>
                <td className={styles.tableCell}>
                  {renderLocationPills(org.locations)}
                </td>
                <td className={styles.tableCell}>
                  {formatDate(org.start_date || org.created_at)}
                </td>
                <td className={styles.tableCell}>
                  {org.state || '--'}
                </td>
                <td className={styles.tableCell}>
                  <span className={styles.placeholderPill}>--</span>
                </td>
                <td className={styles.tableCell}>
                  <span className={styles.employeeCount}>{org.employee_count}</span>
                </td>
                <td className={styles.tableCell}>
                  <span className={styles.placeholderPill}>--/100</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredOrgs.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>
              {searchQuery ? 'No organizations found matching your search.' : 'No organizations found.'}
            </p>
          </div>
        )}
      </div>

      {/* Organization Modal */}
      <OrganizationModal
        open={modalOpen}
        organization={selectedOrg}
        onClose={handleCloseModal}
      />
    </div>
  );
}

export default OrganizationsPage;


