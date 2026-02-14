import * as React from 'react';
import sty from './SmartViewContent.module.css';
import { PositionalRatings } from '@/components/CodeComponents/PositionalRatings';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';

export function SmartViewContent() {
  const { selectedLocationId, selectedLocationImageUrl } = useLocationContext();

  return (
    <div className={sty.container}>
      <PositionalRatings
        className={sty.positionalRatings}
        locationId={selectedLocationId || ''}
        locationImageUrl={selectedLocationImageUrl}
      />
    </div>
  );
}

export default SmartViewContent;
