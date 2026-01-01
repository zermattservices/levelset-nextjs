import React, { useEffect, useMemo, useState, useRef } from 'react';
import { RoadmapLayout } from '@/components/roadmap';
import { RoadmapBoard } from '@/components/roadmap/RoadmapBoard';
import { RoadmapFeature, fetchFeatures } from '@/lib/roadmap';
import { useAuth, AuthData } from '@/lib/providers/AuthProvider';
import styles from '@/components/roadmap/Roadmap.module.css';

type StatusKey = RoadmapFeature['status'];

const STATUS_SECTIONS: { title: string; key: StatusKey }[] = [
  { title: 'Planned', key: 'planned' },
  { title: 'In Progress', key: 'in_progress' },
  { title: 'Completed', key: 'completed' },
];

interface RoadmapBoardPageProps {
  auth?: AuthData;
}

export default function RoadmapBoardPage({ auth: authProp }: RoadmapBoardPageProps) {
  // Use auth from props if available (passed from layout), otherwise use hook
  const authFromHook = useAuth();
  const auth = authProp || authFromHook;
  const [allFeatures, setAllFeatures] = useState<RoadmapFeature[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const loading = !auth.isLoaded || dataLoading;
  
  // Use refs to track loading state
  const hasLoadedRef = useRef(false);
  const prevOrgIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // If auth isn't loaded yet, wait
    if (!auth.isLoaded) {
      return;
    }
    
    // If we've already loaded and org hasn't changed, skip
    if (hasLoadedRef.current && prevOrgIdRef.current === auth.org_id) {
      return;
    }
    
    let isMounted = true;
    
    const load = async () => {
      setDataLoading(true);
      try {
        // Fetch all three statuses; we can fetch wide and filter client-side
        const [planned, inProgress, completed] = await Promise.all([
          fetchFeatures('planned', undefined, 'votes', undefined, auth.org_id || undefined),
          fetchFeatures('in_progress', undefined, 'votes', undefined, auth.org_id || undefined),
          fetchFeatures('completed', undefined, 'votes', undefined, auth.org_id || undefined),
        ]);
        
        if (isMounted) {
          setAllFeatures([...planned, ...inProgress, ...completed]);
          hasLoadedRef.current = true;
          prevOrgIdRef.current = auth.org_id;
        }
      } catch (e) {
        console.error('Error loading roadmap board', e);
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
