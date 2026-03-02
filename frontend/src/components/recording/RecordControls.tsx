'use client';

interface RecordControlsProps {
  onStop: () => void;
  isRecording: boolean;
}

export default function RecordControls({ onStop, isRecording }: RecordControlsProps) {
  return (
    <div className="flex justify-center">
      <button
        onClick={onStop}
        className="
          w-16 h-16 rounded-full
          border-2 border-neon-magenta
          bg-[rgba(255,59,122,0.1)]
          flex items-center justify-center
          cursor-pointer transition-all duration-200
          active:scale-95
        "
        style={{
          boxShadow: '0 0 20px rgba(255,59,122,0.3), 0 0 40px rgba(255,59,122,0.15)',
          animation: isRecording ? 'pulse 2s ease infinite' : 'none',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--neon-magenta)">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </button>
    </div>
  );
}
