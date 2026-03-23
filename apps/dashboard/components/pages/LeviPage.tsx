/**
 * LeviPage — main Levi AI chat page.
 * Access controlled via AI_USE permission.
 */

import * as React from 'react';
import { useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import styles from './LeviPage.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { EmployeeModal } from '@/components/CodeComponents/EmployeeModal';
import { useAuth } from '@/lib/providers/AuthProvider';
import { usePermissions, P } from '@/lib/providers/PermissionsProvider';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useLeviChat } from '@/lib/hooks/useLeviChat';
import { ChatContainer } from '@/components/levi/ChatContainer';
import { createSupabaseClient } from '@/util/supabase/component';
import type { Employee } from '@/lib/supabase.types';

export function LeviPage() {
  const router = useRouter();
  const auth = useAuth();
  const { has } = usePermissions();
  const { selectedLocationId } = useLocationContext();

  // Employee modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );

  // Chat hook
  const chat = useLeviChat();

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [auth.isLoaded, auth.authUser, router]);

  // Handle employee click — fetch full employee, then open modal
  const handleEmployeeClick = useCallback(
    async (employeeId: string) => {
      try {
        const supabase = createSupabaseClient();
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('id', employeeId)
          .single();

        if (error || !data) {
          console.warn('[LeviPage] Failed to fetch employee:', error);
          return;
        }
        setSelectedEmployee(data as Employee);
        setModalOpen(true);
      } catch (err) {
        console.warn('[LeviPage] Error fetching employee:', err);
      }
    },
    []
  );

  if (!auth.isLoaded || !auth.authUser) {
    return <AuthLoadingScreen />;
  }

  const canUseLevi = has(P.AI_USE);

  return (
    <>
      <Head>
        <title>Levi | Levelset</title>
      </Head>
      <div className={styles.page}>
        <MenuNavigation fullWidth />

        {canUseLevi ? (
          <div className={styles.chatArea}>
            <ChatContainer
              historyMessages={chat.historyMessages}
              sessionMessages={chat.sessionMessages}
              historyLoaded={chat.historyLoaded}
              isLoadingMore={chat.isLoadingMore}
              hasMoreHistory={chat.hasMoreHistory}
              loadMoreHistory={chat.loadMoreHistory}
              sendMessage={chat.sendMessage}
              clearConversation={chat.clearConversation}
              status={chat.status}
              onEmployeeClick={handleEmployeeClick}
            />
          </div>
        ) : (
          <div className={styles.accessDenied}>
            <h2 className={styles.accessDeniedTitle}>Access Restricted</h2>
            <p className={styles.accessDeniedText}>
              You don&apos;t have permission to use Levi AI. Contact your administrator to request access.
            </p>
          </div>
        )}
      </div>

      <EmployeeModal
        open={modalOpen}
        employee={selectedEmployee}
        onClose={() => {
          setModalOpen(false);
          setSelectedEmployee(null);
        }}
        locationId={selectedLocationId || ''}
      />
    </>
  );
}
