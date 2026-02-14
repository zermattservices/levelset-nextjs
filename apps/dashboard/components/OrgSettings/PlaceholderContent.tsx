import * as React from 'react';
import sty from './PlaceholderContent.module.css';
import ConstructionIcon from '@mui/icons-material/Construction';

interface PlaceholderContentProps {
  title: string;
  description: string;
}

export function PlaceholderContent({ title, description }: PlaceholderContentProps) {
  return (
    <div className={sty.container}>
      <div className={sty.header}>
        <h2 className={sty.title}>{title}</h2>
        <p className={sty.description}>{description}</p>
      </div>
      <div className={sty.placeholderBox}>
        <ConstructionIcon sx={{ fontSize: 32, color: '#999' }} />
        <span className={sty.placeholderText}>Configuration options will appear here</span>
      </div>
    </div>
  );
}

export default PlaceholderContent;
