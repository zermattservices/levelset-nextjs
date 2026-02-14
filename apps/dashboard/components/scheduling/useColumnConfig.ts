import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';

export interface ColumnConfig {
  showHours: boolean;
  showWage: boolean;
  showRole: boolean;
}

const STORAGE_KEY_PREFIX = 'levelset.scheduling.columnConfig';

const DEFAULT_CONFIG: ColumnConfig = {
  showHours: true,
  showWage: true,
  showRole: false,
};

export function useColumnConfig() {
  const auth = useAuth();
  const userId = auth.id;
  const storageKey = `${STORAGE_KEY_PREFIX}.${userId}`;

  const [config, setConfig] = useState<ColumnConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    if (!userId) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(stored) });
      }
    } catch { /* ignore parse errors */ }
  }, [userId, storageKey]);

  const updateConfig = useCallback((partial: Partial<ColumnConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...partial };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [storageKey]);

  return { config, updateConfig };
}
