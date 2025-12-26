/**
 * ImpersonationBanner
 * Displays a prominent banner when a Levelset Admin is testing as another user
 */

import * as React from 'react';
import { useImpersonation } from '@/lib/providers/ImpersonationProvider';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import styles from './ImpersonationBanner.module.css';

export function ImpersonationBanner() {
  const {
    isImpersonating,
    impersonatedUser,
    endImpersonation,
    consoleLoggingEnabled,
    networkLoggingEnabled,
    setConsoleLoggingEnabled,
    setNetworkLoggingEnabled,
  } = useImpersonation();

  // Add/remove body class for padding adjustment
  React.useEffect(() => {
    if (isImpersonating) {
      document.body.classList.add('impersonating');
    } else {
      document.body.classList.remove('impersonating');
    }
    
    return () => {
      document.body.classList.remove('impersonating');
    };
  }, [isImpersonating]);

  // Don't render if not impersonating
  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  const handleExit = () => {
    endImpersonation();
    // Optionally redirect to admin mode page
    window.location.href = '/admin-mode';
  };

  return (
    <div className={styles.banner}>
      {/* User info section */}
      <div className={styles.userInfo}>
        <div className={styles.icon}>
          <PersonIcon sx={{ fontSize: 18, color: '#ffffff' }} />
        </div>
        <div>
          <div className={styles.testingLabel}>Testing As</div>
          <div className={styles.userName}>{impersonatedUser.full_name}</div>
          <div className={styles.userDetails}>
            <span>{impersonatedUser.email}</span>
            <span className={styles.detailDivider} />
            <span>{impersonatedUser.org_name}</span>
            {impersonatedUser.location_number && (
              <>
                <span className={styles.detailDivider} />
                <span>Location #{impersonatedUser.location_number}</span>
              </>
            )}
            <span className={styles.detailDivider} />
            <span>{impersonatedUser.role}</span>
          </div>
        </div>
      </div>

      {/* Controls section */}
      <div className={styles.controls}>
        {/* Debug toggles */}
        <div className={styles.toggleGroup}>
          <div className={styles.toggle}>
            <span className={styles.toggleLabel}>Console Log</span>
            <div 
              className={`${styles.switch} ${consoleLoggingEnabled ? styles.active : ''}`}
              onClick={() => setConsoleLoggingEnabled(!consoleLoggingEnabled)}
              role="switch"
              aria-checked={consoleLoggingEnabled}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setConsoleLoggingEnabled(!consoleLoggingEnabled);
                }
              }}
            >
              <div className={styles.switchThumb} />
            </div>
          </div>
          
          <div className={styles.toggle}>
            <span className={styles.toggleLabel}>Network Log</span>
            <div 
              className={`${styles.switch} ${networkLoggingEnabled ? styles.active : ''}`}
              onClick={() => setNetworkLoggingEnabled(!networkLoggingEnabled)}
              role="switch"
              aria-checked={networkLoggingEnabled}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setNetworkLoggingEnabled(!networkLoggingEnabled);
                }
              }}
            >
              <div className={styles.switchThumb} />
            </div>
          </div>
        </div>

        {/* Exit button */}
        <button className={styles.exitButton} onClick={handleExit}>
          <LogoutIcon sx={{ fontSize: 16 }} />
          Exit Session
        </button>
      </div>
    </div>
  );
}

export default ImpersonationBanner;
