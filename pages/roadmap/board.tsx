import React, { useEffect, useMemo, useState } from 'react';
import { RoadmapLayout } from '@/components/roadmap';
import { RoadmapBoard } from '@/components/roadmap/RoadmapBoard';
import { RoadmapFeature, fetchFeatures } from '@/lib/roadmap';
import { useAuth } from '@/lib/providers/AuthProvider';
import styles from '@/components/roadmap/Roadmap.module.css';

type StatusKey = RoadmapFeature['status'];

const STATUS_SECTIONS: { title: string; key: StatusKey }[] = [
  { title: 'Planned', key: 'planned' },
  { title: 'In Progress', key: 'in_progress' },
  { title: 'Completed', key: 'completed' },
];

export default function RoadmapBoardPage() {
  const auth = useAuth();
  const [allFeatures, setAllFeatures] = useState<RoadmapFeature[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const loading = !auth.isLoaded || dataLoading;

  useEffect(() => {
    let isMounted = true;
    console.log('[RoadmapBoard] useEffect triggered, auth.isLoaded:', auth.isLoaded);
    
    const load = async () => {
      if (!auth.isLoaded) {
        console.log('[RoadmapBoard] Waiting for auth...');
        return;
      }
      
      console.log('[RoadmapBoard] Starting data load...');
      setDataLoading(true);
      try {
        // Fetch all three statuses; we can fetch wide and filter client-side
        const [planned, inProgress, completed] = await Promise.all([
          fetchFeatures('planned', undefined, 'votes', undefined, auth.org_id || undefined),
          fetchFeatures('in_progress', undefined, 'votes', undefined, auth.org_id || undefined),
          fetchFeatures('completed', undefined, 'votes', undefined, auth.org_id || undefined),
        ]);
        
        if (isMounted) {
          console.log('[RoadmapBoard] Data loaded:', { planned: planned.length, inProgress: inProgress.length, completed: completed.length });
          setAllFeatures([...planned, ...inProgress, ...completed]);
        }
      } catch (e) {
        console.error('[RoadmapBoard] Error loading roadmap board', e);
      } finally {
        if (isMounted) {
          setDataLoading(false);
        }
      }
    };
    
    load();
    
    return () => {
      isMounted = false;
    };
  }, [auth.isLoaded, auth.org_id]);

  const sections = useMemo(() => {
    return STATUS_SECTIONS.map(({ title, key }) => {
      const items = allFeatures.filter((f) => f.status === key);
      return { title, statusKey: key, count: items.length, items };
    });
  }, [allFeatures]);

  return (
    <RoadmapLayout subHeaderMode="board" activeTab="roadmap" title="Product Roadmap">
      <div className={styles.hero} style={{ paddingBottom: 32 }}>
        <h1 className={styles.heroTitle} style={{ fontSize: 36, marginBottom: 12 }}>Product Roadmap</h1>
        <p className={styles.heroSubtitle} style={{ marginBottom: 0 }}>
          Track the progress of features from planning to completion.
        </p>
      </div>
      {loading ? (
        <div className={styles.loadingState} style={{ padding: '40px 32px' }}>Loading roadmap...</div>
      ) : (
        <RoadmapBoard sections={sections} />
      )}
    </RoadmapLayout>
  );
}
