import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  onEnd: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onEnd, width = 350, height = 120 }) => {
  const sigPadRef = useRef<SignatureCanvas>(null);

  const handleEnd = () => {
    if (sigPadRef.current) {
      const dataUrl = sigPadRef.current.getTrimmedCanvas().toDataURL('image/png');
      onEnd(dataUrl);
    }
  };

  const handleClear = () => {
    sigPadRef.current?.clear();
    onEnd('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <SignatureCanvas
        ref={sigPadRef}
        penColor="black"
        backgroundColor="transparent"
        canvasProps={{ width, height, style: { border: '1px solid #ccc', borderRadius: 8 } }}
        onEnd={handleEnd}
      />
      <button type="button" onClick={handleClear} style={{ marginTop: 8, fontSize: 12 }}>
        נקה חתימה
      </button>
    </div>
  );
};

export default SignaturePad; 