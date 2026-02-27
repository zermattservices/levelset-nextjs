import * as React from 'react';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import { StyledSelect, menuItemSx } from '@/components/forms/dialogStyles';
import { createSupabaseClient } from '@/util/supabase/component';
import styles from './EmployeeImportStep.module.css';

interface OrgRole {
  id: string;
  role_name: string;
  hierarchy_level: number;
  is_leader: boolean;
  color: string;
}

interface ImportedEmployee {
  tempId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isFoh: boolean;
  isBoh: boolean;
  isLeader: boolean;
  hsId?: string;
  hireDate?: string;
  fromLevi?: boolean;
}

interface EmployeeImportStepProps {
  accessToken: string;
  orgId: string;
  locationId: string;
  orgRoles: OrgRole[];
  initialData: { employees: ImportedEmployee[] } | null;
  onComplete: (data: { employees: ImportedEmployee[] }) => void;
  onSkip: () => void;
  onBack?: () => void;
}

type ImportMethod = 'none' | 'hotschedules' | 'csv';

function generateTempId(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function parseCSV(text: string): ImportedEmployee[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header row
  const headerLine = lines[0];
  const headers = parseCSVRow(headerLine).map(h => h.toLowerCase().trim());

  // Map common header variations
  const firstNameIdx = headers.findIndex(h =>
    h === 'firstname' || h === 'first_name' || h === 'first name' || h === 'first'
  );
  const lastNameIdx = headers.findIndex(h =>
    h === 'lastname' || h === 'last_name' || h === 'last name' || h === 'last'
  );
  const emailIdx = headers.findIndex(h =>
    h === 'email' || h === 'email address' || h === 'email_address'
  );
  const phoneIdx = headers.findIndex(h =>
    h === 'phone' || h === 'phone number' || h === 'phone_number' || h === 'mobile'
  );

  if (firstNameIdx === -1 && lastNameIdx === -1) {
    // Try a single "name" column
    const nameIdx = headers.findIndex(h => h === 'name' || h === 'full name' || h === 'full_name' || h === 'employee name');
    if (nameIdx === -1) return [];

    return lines.slice(1)
      .map(line => {
        const cols = parseCSVRow(line);
        const fullName = (cols[nameIdx] || '').trim();
        if (!fullName) return null;

        const nameParts = fullName.split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        return {
          tempId: generateTempId(),
          firstName,
          lastName,
          email: emailIdx >= 0 ? (cols[emailIdx] || '').trim() : '',
          phone: phoneIdx >= 0 ? (cols[phoneIdx] || '').trim() : '',
          role: '',
          isFoh: false,
          isBoh: false,
          isLeader: false,
        };
      })
      .filter((e): e is ImportedEmployee => e !== null && (e.firstName !== '' || e.lastName !== ''));
  }

  return lines.slice(1)
    .map(line => {
      const cols = parseCSVRow(line);
      const firstName = firstNameIdx >= 0 ? (cols[firstNameIdx] || '').trim() : '';
      const lastName = lastNameIdx >= 0 ? (cols[lastNameIdx] || '').trim() : '';

      if (!firstName && !lastName) return null;

      return {
        tempId: generateTempId(),
        firstName,
        lastName,
        email: emailIdx >= 0 ? (cols[emailIdx] || '').trim() : '',
        phone: phoneIdx >= 0 ? (cols[phoneIdx] || '').trim() : '',
        role: '',
        isFoh: false,
        isBoh: false,
        isLeader: false,
      };
    })
    .filter((e): e is ImportedEmployee => e !== null);
}

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

export function EmployeeImportStep({
  accessToken,
  orgId,
  locationId,
  orgRoles,
  initialData,
  onComplete,
  onSkip,
  onBack,
}: EmployeeImportStepProps) {
  const [importMethod, setImportMethod] = React.useState<ImportMethod>(
    initialData?.employees && initialData.employees.length > 0 ? 'hotschedules' : 'none'
  );
  const [employees, setEmployees] = React.useState<ImportedEmployee[]>(
    initialData?.employees || []
  );
  const [error, setError] = React.useState<string | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);

  // Polling state for HS sync
  const [polling, setPolling] = React.useState(false);
  const [pollStartTime, setPollStartTime] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cardTopRef = React.useRef<HTMLDivElement>(null);

  // Bookmarklet: exact copy of dashboard SyncEmployeesModal bookmarklet.
  // Fetches employees + shifts + jobs + bootstrap from HS API,
  // then POSTs everything to the production /api/employees/sync-hotschedules endpoint.
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const bookmarkletCode = React.useMemo(() => {
    if (!baseUrl) return '';

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
}).then(function(r){if(!r.ok){return r.json().then(function(data){throw new Error(data.error||'Sync failed');});}return r.json();}).then(function(data){loadingDiv.remove();var resultDiv=document.createElement('div');resultDiv.style.cssText='position:fixed;top:20px;right:20px;background:'+(data.success?'#10b981':'#ef4444')+';color:white;padding:20px;border-radius:8px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui,sans-serif;max-width:400px;';if(data.success){var msg='<strong>Sync Successful!</strong><br><br>Employees: '+data.stats.new+' new, '+data.stats.modified+' updated, '+data.stats.terminated+' terminated';if(data.stats.shifts_received){msg+='<br>Shifts: '+data.stats.shifts_received+' captured';}if(data.stats.jobs_received){msg+='<br>Jobs: '+data.stats.jobs_received;}msg+='<br><br>Return to the Levelset setup tab to continue.';resultDiv.innerHTML=msg;}else{resultDiv.innerHTML='<strong>Sync Failed</strong><br><br>'+data.error+(data.details?'<br><br>Details: '+data.details:'');}document.body.appendChild(resultDiv);setTimeout(function(){resultDiv.remove();},8000);}).catch(function(err){loadingDiv.remove();var errorDiv=document.createElement('div');errorDiv.style.cssText='position:fixed;top:20px;right:20px;background:#ef4444;color:white;padding:20px;border-radius:8px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui,sans-serif;max-width:400px;';errorDiv.innerHTML='<strong>Error</strong><br><br>'+err.message;document.body.appendChild(errorDiv);setTimeout(function(){errorDiv.remove();},8000);});
})();`;

    return code;
  }, [baseUrl]);

  const sortedRoles = React.useMemo(
    () => [...orgRoles].sort((a, b) => a.hierarchy_level - b.hierarchy_level),
    [orgRoles]
  );

  // Find the first non-Operator role (hierarchy_level 1)
  const requiredLeaderRole = React.useMemo(
    () => sortedRoles.find(r => r.hierarchy_level === 1 && r.role_name !== 'Operator'),
    [sortedRoles]
  );

  // Default role: lowest hierarchy (highest number) non-Operator role
  const defaultRole = React.useMemo(() => {
    const nonOperator = sortedRoles.filter(r => r.role_name !== 'Operator');
    return nonOperator.length > 0 ? nonOperator[nonOperator.length - 1].role_name : '';
  }, [sortedRoles]);

  // Refs so the polling effect can read latest values without restarting
  const defaultRoleRef = React.useRef(defaultRole);
  React.useEffect(() => { defaultRoleRef.current = defaultRole; }, [defaultRole]);

  const sortedRolesRef = React.useRef(sortedRoles);
  React.useEffect(() => { sortedRolesRef.current = sortedRoles; }, [sortedRoles]);

  // Poll for HS sync notification (same as dashboard SyncEmployeesModal)
  React.useEffect(() => {
    if (!polling || !locationId || !pollStartTime) return;

    let cancelled = false;

    const pollInterval = setInterval(async () => {
      if (cancelled) return;

      try {
        const res = await fetch(
          `/api/employees/sync-notification?location_id=${encodeURIComponent(locationId)}`
        );
        if (!res.ok || cancelled) return;

        const data = await res.json();
        if (data.notification) {
          // Only accept notifications created AFTER polling started
          const notificationTime = new Date(data.notification.created_at).getTime();
          const startTime = new Date(pollStartTime).getTime();
          if (notificationTime <= startTime) return;

          const syncData = data.notification.sync_data || {};
          const newEmps = syncData.new_employees || [];

          // Extract employees from notification and sort by first name
          const imported: ImportedEmployee[] = newEmps
            .map((emp: any) => ({
              tempId: generateTempId(),
              firstName: emp.first_name || '',
              lastName: emp.last_name || '',
              email: emp.email || '',
              phone: emp.phone || '',
              role: defaultRoleRef.current,
              isFoh: false,
              isBoh: false,
              isLeader: false,
              hsId: emp.hs_id ? String(emp.hs_id) : undefined,
              hireDate: emp.hire_date || undefined,
              fromLevi: false,
            }))
            .sort((a: ImportedEmployee, b: ImportedEmployee) =>
              a.firstName.localeCompare(b.firstName)
            );

          // Enrich with FOH/BOH detection from raw HS data
          if (imported.length > 0) {
            try {
              // Get a fresh token — the original accessToken may have expired
              // while the user was on HotSchedules running the bookmarklet
              const sb = createSupabaseClient();
              const { data: { session: freshSession } } = await sb.auth.getSession();
              const freshToken = freshSession?.access_token || accessToken;

              const fohBohRes = await fetch(
                `/api/onboarding/hs-sync-result?location_id=${encodeURIComponent(locationId)}`,
                { headers: { Authorization: `Bearer ${freshToken}` } }
              );
              if (cancelled) return;
              if (fohBohRes.ok) {
                const fohBohData = await fohBohRes.json();
                if (fohBohData.fohBohMap) {
                  // Merge FOH/BOH results by hs_id
                  for (const emp of imported) {
                    if (emp.hsId && fohBohData.fohBohMap[emp.hsId]) {
                      emp.isFoh = fohBohData.fohBohMap[emp.hsId].isFoh ?? false;
                      emp.isBoh = fohBohData.fohBohMap[emp.hsId].isBoh ?? false;
                    }
                  }
                  // Also apply salaried leader detection
                  if (fohBohData.salariedMap) {
                    const currentRoles = sortedRolesRef.current;
                    const leaderRole = currentRoles.find(
                      r => r.hierarchy_level === 1 && r.role_name !== 'Operator'
                    );
                    for (const emp of imported) {
                      if (emp.hsId && fohBohData.salariedMap[emp.hsId] && leaderRole) {
                        emp.role = leaderRole.role_name;
                        emp.isLeader = true;
                      }
                    }
                  }
                }
              }
            } catch {
              // Non-fatal — FOH/BOH will default to unchecked
            }
          }

          if (cancelled) return;

          setEmployees(imported);
          setPolling(false);
          setPollStartTime(null);

          // Mark notification as viewed
          try {
            await fetch('/api/employees/sync-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ notification_id: data.notification.id }),
            });
          } catch {
            // Non-fatal
          }
        }
      } catch {
        // Non-fatal — keep polling
      }
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [polling, locationId, pollStartTime, accessToken]);

  // Start polling when user enters HS flow
  const startPolling = () => {
    setPollStartTime(new Date().toISOString());
    setPolling(true);
  };

  // Stop polling when leaving HS flow
  const stopPolling = () => {
    setPolling(false);
    setPollStartTime(null);
  };

  const updateEmployee = (tempId: string, updates: Partial<ImportedEmployee>) => {
    setEmployees(prev =>
      prev.map(emp => (emp.tempId === tempId ? { ...emp, ...updates } : emp))
    );
  };

  const handleRoleChange = (tempId: string, roleName: string) => {
    const role = orgRoles.find(r => r.role_name === roleName);
    updateEmployee(tempId, {
      role: roleName,
      isLeader: role ? role.is_leader : false,
    });
  };

  const removeEmployee = (tempId: string) => {
    setEmployees(prev => prev.filter(emp => emp.tempId !== tempId));
  };

  const handleCSVFile = (file: File) => {
    setError(null);

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.CSV')) {
      setError('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setError('Could not read the file');
        return;
      }

      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setError('No employees found in the CSV. Make sure it has columns for first name, last name, email, or phone.');
        return;
      }

      setEmployees(parsed);
    };

    reader.onerror = () => {
      setError('Failed to read the file');
    };

    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) handleCSVFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleCSVFile(file);
  };

  const handleSubmit = () => {
    setValidationError(null);
    setError(null);

    if (employees.length === 0) {
      setError('Import employees first or skip this step');
      return;
    }

    // Check that all employees have a role assigned
    const emptyRoleCount = employees.filter(emp => !emp.role).length;
    if (emptyRoleCount > 0) {
      setValidationError(
        `${emptyRoleCount} employee${emptyRoleCount > 1 ? 's' : ''} still need${emptyRoleCount === 1 ? 's' : ''} a role assigned.`
      );
      cardTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // Check that at least one employee has the required leader role
    if (requiredLeaderRole) {
      const hasLeaderAssigned = employees.some(
        emp => emp.role === requiredLeaderRole.role_name
      );
      if (!hasLeaderAssigned) {
        setValidationError(
          `You must select at least one ${requiredLeaderRole.role_name} to continue.`
        );
        cardTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    onComplete({
      employees: employees.map(emp => ({
        ...emp,
        firstName: emp.firstName.trim(),
        lastName: emp.lastName.trim(),
        email: emp.email.trim(),
        phone: emp.phone.trim(),
      })),
    });
  };

  const showTable = employees.length > 0;

  // Method selection view
  if (importMethod === 'none' && !showTable) {
    return (
      <div>
        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Import Employees</h3>
          <p className={styles.sectionDescription}>
            Add your team members to get started. You can import from HotSchedules or
            upload a CSV export from your HR or payroll system.
          </p>

          <div className={styles.methodCards}>
            <button
              type="button"
              className={styles.methodCard}
              onClick={() => {
                setImportMethod('hotschedules');
                startPolling();
              }}
            >
              <img
                src="/hs_logo.png"
                alt="HotSchedules"
                className={styles.methodCardImg}
              />
              <span className={styles.methodCardTitle}>HotSchedules Sync</span>
              <span className={styles.methodCardDesc}>
                Sync employees directly from HotSchedules using the bookmarklet
              </span>
            </button>

            <button
              type="button"
              className={styles.methodCard}
              onClick={() => setImportMethod('csv')}
            >
              <svg className={styles.methodCardSvg} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 18V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 15L12 12L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className={styles.methodCardTitle}>Upload HR/Payroll Report</span>
              <span className={styles.methodCardDesc}>
                Upload a fresh Hire Date Report from HR/Payroll
              </span>
            </button>
          </div>
        </div>

        <button type="button" className={styles.skipLink} onClick={onSkip}>
          Skip for now
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* HotSchedules flow (before table) — mirrors dashboard SyncEmployeesModal */}
      {importMethod === 'hotschedules' && !showTable && (
        <div className={styles.card}>
          <div className={styles.methodHeader}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => {
                setImportMethod('none');
                stopPolling();
              }}
            >
              &#8592; Back
            </button>
            <h3 className={styles.sectionTitle}>HotSchedules Import</h3>
          </div>

          <div className={styles.bookmarkletSection}>
            {/* Step 1: Login to HotSchedules */}
            <div className={styles.bookmarkletStep}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <div className={styles.stepLabel}>Login to HotSchedules</div>
                <p className={styles.stepHint}>
                  First, make sure you&apos;re logged into HotSchedules. Click the button below to open HotSchedules in a new tab.
                </p>
                <a
                  href="https://app.hotschedules.com/hs/login.jsp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.hsLoginLink}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 3H21V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Open HotSchedules
                </a>
              </div>
            </div>

            {/* Step 2: Install the Bookmarklet */}
            <div className={styles.bookmarkletStep}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <div className={styles.stepLabel}>Install the Bookmarklet</div>
                <p className={styles.stepHint}>
                  Drag the bookmarklet link below to your browser&apos;s bookmarks bar:
                </p>
                <div className={styles.bookmarkletTip}>
                  <strong>Tip:</strong> If you don&apos;t see your bookmarks bar, press{' '}
                  <code>Ctrl+Shift+B</code> (Windows) or <code>Cmd+Shift+B</code> (Mac)
                </div>
                <div className={styles.bookmarkletLinkWrapper}>
                  {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                  <a
                    href={bookmarkletCode}
                    className={styles.bookmarkletLink}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', bookmarkletCode);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={(e) => e.preventDefault()}
                  >
                    Levelset HS Sync
                  </a>
                  <span className={styles.bookmarkletLinkHint}>
                    Drag this to your bookmarks bar
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3: Run the Sync */}
            <div className={styles.bookmarkletStep}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <div className={styles.stepLabel}>Run the Sync</div>
                <p className={styles.stepHint}>
                  Once you&apos;ve logged in to HotSchedules:
                </p>
                <ol className={styles.stepInstructions}>
                  <li>Navigate to the <strong>Scheduling page</strong> in HotSchedules</li>
                  <li>Click the <strong>Levelset HS Sync</strong> bookmark you just added</li>
                  <li>The bookmarklet will automatically capture employee data and sync it to Levelset</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Waiting indicator */}
          {polling && (
            <div className={styles.waitingBanner}>
              <div className={styles.waitingSpinner} />
              <span>Waiting for HotSchedules sync&hellip;</span>
              <span className={styles.waitingHint}>
                Run the bookmarklet on HotSchedules — this page will update automatically.
              </span>
            </div>
          )}
        </div>
      )}

      {/* CSV flow (before table) */}
      {importMethod === 'csv' && !showTable && (
        <div className={styles.card}>
          <div className={styles.methodHeader}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setImportMethod('none')}
            >
              &#8592; Back
            </button>
            <h3 className={styles.sectionTitle}>Upload CSV</h3>
          </div>
          <p className={styles.sectionDescription}>
            Upload a CSV file with employee data. The file should include columns
            for first name, last name, email, and/or phone number.
          </p>

          <div
            className={`${styles.csvDropZone} ${dragActive ? styles.csvDropZoneActive : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className={styles.csvDropSvg} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 3V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={styles.csvDropText}>
              Drag and drop your CSV file here
            </span>
            <span className={styles.csvDropSubtext}>
              or click to browse
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      )}

      {/* Employee table (after import) */}
      {showTable && (
        <div className={styles.card} ref={cardTopRef}>
          <div className={styles.methodHeader}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => {
                setEmployees([]);
                setImportMethod('none');
                setError(null);
                setValidationError(null);
                stopPolling();
              }}
            >
              &#8592; Start over
            </button>
            <h3 className={styles.sectionTitle}>
              Review Employees ({employees.length})
            </h3>
          </div>

          <div className={styles.infoBanner}>
            <span className={styles.infoBannerIcon}>&#9432;</span>
            <span>
              You can finish assigning roles and areas later in{' '}
              <strong>Roster</strong>.
            </span>
          </div>

          {validationError && (
            <div className={styles.validationBanner}>{validationError}</div>
          )}

          <div className={styles.tableWrapper}>
            <table className={styles.employeeTable}>
              <thead>
                <tr>
                  <th className={styles.thName}>Name</th>
                  <th className={styles.thHireDate}>Hire Date</th>
                  <th className={styles.thRole}>Role</th>
                  <th className={styles.thCheckbox}>FOH</th>
                  <th className={styles.thCheckbox}>BOH</th>
                  <th className={styles.thAction}></th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.tempId} className={styles.employeeRow}>
                    <td className={styles.tdName}>
                      <div className={styles.employeeName}>
                        {emp.firstName} {emp.lastName}
                      </div>
                      {emp.phone && (
                        <div className={styles.employeePhone}>{emp.phone}</div>
                      )}
                    </td>
                    <td className={styles.tdHireDate}>
                      {emp.hireDate
                        ? new Date(emp.hireDate + 'T00:00:00').toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '\u2014'}
                    </td>
                    <td className={styles.tdRole}>
                      <FormControl fullWidth size="small" error={!!validationError && !emp.role}>
                        <StyledSelect
                          value={emp.role}
                          onChange={e => handleRoleChange(emp.tempId, e.target.value as string)}
                          displayEmpty
                          renderValue={(value: any) =>
                            value ? value : <span style={{ color: 'var(--ls-color-muted)' }}>-- Select --</span>
                          }
                          sx={{
                            fontSize: 13,
                            borderRadius: '6px',
                            ...(!emp.role && validationError ? {
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'var(--ls-color-destructive) !important',
                              },
                            } : {}),
                          }}
                        >
                          {sortedRoles
                            .filter(role => role.role_name !== 'Operator')
                            .map(role => (
                              <MenuItem key={role.id} value={role.role_name} sx={menuItemSx}>
                                {role.role_name}
                              </MenuItem>
                            ))}
                        </StyledSelect>
                      </FormControl>
                    </td>
                    <td className={styles.tdCheckbox}>
                      <input
                        type="checkbox"
                        className={styles.checkboxFoh}
                        checked={emp.isFoh}
                        onChange={e =>
                          updateEmployee(emp.tempId, { isFoh: e.target.checked })
                        }
                      />
                    </td>
                    <td className={styles.tdCheckbox}>
                      <input
                        type="checkbox"
                        className={styles.checkboxBoh}
                        checked={emp.isBoh}
                        onChange={e =>
                          updateEmployee(emp.tempId, { isBoh: e.target.checked })
                        }
                      />
                    </td>
                    <td className={styles.tdAction}>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeEmployee(emp.tempId)}
                        title="Remove employee"
                      >
                        &#10005;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button type="button" className={styles.skipLink} onClick={onSkip}>
        Skip for now
      </button>

      <div className={styles.navRow}>
        {onBack && (
          <button type="button" className={styles.stepBackBtn} onClick={onBack}>
            &#8592; Back
          </button>
        )}
        {showTable && (
          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleSubmit}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
