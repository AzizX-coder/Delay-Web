import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';

export function WhiteboardPage() {
  return (
    <div className="w-full h-full relative touch-none" style={{ zIndex: 0 }}>
      <Tldraw 
        licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}
        persistenceKey="delay-tldraw-v1"
        autoFocus
      />
    </div>
  );
}
