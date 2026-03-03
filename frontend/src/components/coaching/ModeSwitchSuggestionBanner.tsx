'use client';

import type { StageMode } from '../../types/coaching';

interface ModeSwitchSuggestionBannerProps {
  visible: boolean;
  suggestedMode: StageMode | null;
  reason: string | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function ModeSwitchSuggestionBanner({
  visible,
  suggestedMode,
  reason,
  onAccept,
  onDecline,
}: ModeSwitchSuggestionBannerProps) {
  if (!visible || !suggestedMode) return null;

  const modeName = suggestedMode === 'logical' ? '論理整理' : '感情整理';
  const modeColor = suggestedMode === 'logical' ? '#00D4FF' : '#FF3B7A';

  return (
    <div
      className="mx-4 mb-2 rounded-lg border p-3 font-mono"
      style={{ borderColor: modeColor, background: `${modeColor}10` }}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-sm">💡</span>
        <span className="text-xs font-bold" style={{ color: modeColor }}>
          AIからの提案
        </span>
      </div>
      {reason && (
        <p className="text-gray-400 text-xs mb-3 leading-relaxed">{reason}</p>
      )}
      <p className="text-xs mb-3" style={{ color: modeColor }}>
        {modeName}モードに切り替えませんか？
      </p>
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 py-2 rounded text-xs font-bold transition-all"
          style={{ background: modeColor, color: '#0A0E1A' }}
        >
          切り替える
        </button>
        <button
          onClick={onDecline}
          className="flex-1 py-2 rounded text-xs font-bold border border-gray-600 text-gray-400 hover:border-gray-400 transition-all"
        >
          このまま続ける
        </button>
      </div>
    </div>
  );
}
