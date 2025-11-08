import * as React from 'react';
import { PlasmicCanvasHost } from '@plasmicapp/loader-nextjs';
import { PLASMIC } from '../plasmic-init';
import { LocationProvider } from '@/components/CodeComponents/LocationContext';

export default function PlasmicHost() {
  return (
    PLASMIC && (
      <LocationProvider>
        <PlasmicCanvasHost />
      </LocationProvider>
    )
  );
}
