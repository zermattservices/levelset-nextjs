import * as React from 'react';
import sty from './ComingSoonPlaceholder.module.css';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

interface ComingSoonPlaceholderProps {
  title: string;
  description: string;
}

export function ComingSoonPlaceholder({ title, description }: ComingSoonPlaceholderProps) {
  return (
    <div className={sty.container}>
      <div className={sty.iconContainer}>
        <RocketLaunchIcon sx={{ fontSize: 48, color: '#31664a' /* TODO: Use design token */ }} />
      </div>
      <h2 className={sty.title}>{title}</h2>
      <p className={sty.description}>{description}</p>
      <div className={sty.badge}>Coming Soon</div>
    </div>
  );
}

export default ComingSoonPlaceholder;
