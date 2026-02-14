import * as React from 'react';
import { useRouter } from 'next/router';
import { SupabaseUserLogOut } from '@/components/CodeComponents/auth/SupabaseUserLogOut';
import sty from './LogoutButton.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface LogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function LogoutButton({ className, children }: LogoutButtonProps) {
  const router = useRouter();
  const [isHovering, setIsHovering] = React.useState(false);

  return (
    <SupabaseUserLogOut
      className={classNames(sty.root, className)}
      onSuccess={() => router.push('/auth/login')}
    >
      <div 
        className={classNames(projectcss.all, sty.freeBox)}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <span className={classNames(sty.slotTargetSlot3, isHovering && sty.slotTargetSlot3logoutHover)}>
          {children ?? 'Log out'}
        </span>
      </div>
    </SupabaseUserLogOut>
  );
}

export default LogoutButton;
