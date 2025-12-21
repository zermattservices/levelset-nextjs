import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import sty from './MobileAppAccess.module.css';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';

export function MobileAppAccess() {
  const { selectedLocationMobileToken, selectedLocationNumber } = useLocationContext();

  const pwaUrl = selectedLocationMobileToken 
    ? `https://app.levelset.io/mobile/${selectedLocationMobileToken}`
    : null;

  return (
    <div className={sty.container}>
      <div className={sty.intro}>
        <h3 className={sty.introTitle}>Mobile App Access</h3>
        <p className={sty.introDescription}>
          Use this QR code to give team members access to the Levelset mobile app. 
          When scanned, it will open the app directly for this location.
        </p>
      </div>

      <div className={sty.qrSection}>
        {pwaUrl ? (
          <>
            <div className={sty.qrContainer}>
              <QRCodeSVG
                value={pwaUrl}
                size={200}
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: '/favicon.ico',
                  x: undefined,
                  y: undefined,
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>
            <div className={sty.qrInfo}>
              <p className={sty.locationLabel}>
                Location: <strong>{selectedLocationNumber || 'Unknown'}</strong>
              </p>
              <p className={sty.urlText}>{pwaUrl}</p>
            </div>
            <div className={sty.instructions}>
              <h4 className={sty.instructionsTitle}>How to use:</h4>
              <ol className={sty.instructionsList}>
                <li>Print this page or display it on a screen</li>
                <li>Have team members scan the QR code with their phone camera</li>
                <li>They will be taken directly to the Levelset mobile app</li>
                <li>Team members can add the app to their home screen for quick access</li>
              </ol>
            </div>
          </>
        ) : (
          <div className={sty.noToken}>
            <p>No mobile token found for this location.</p>
            <p>Please contact support to enable mobile access.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileAppAccess;
