'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { deleteAccount } from '@/lib/api';
import GlassCard from '@/components/ui/GlassCard';
import NeonButton from '@/components/ui/NeonButton';

const APP_VERSION = '0.1.0';

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    router.push('/login');
    return null;
  }

  const clearLocalData = () => {
    localStorage.removeItem('kataru_onboarding_completed');
    localStorage.removeItem('kataru_onboarding_progress');
    localStorage.removeItem('kataru_feedback_completed');
    localStorage.removeItem('kataru_feedback_score');
    localStorage.removeItem('kataru_device_id');
    localStorage.removeItem('kataru_waitlist');
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== '削除') return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      clearLocalData();
      await signOut();
      router.push('/login');
    } catch {
      setError('アカウントの削除に失敗しました。時間を置いて再試行してください。');
      setDeleting(false);
    }
  };

  const handleReplayOnboarding = () => {
    localStorage.removeItem('kataru_onboarding_completed');
    localStorage.removeItem('kataru_onboarding_progress');
    router.push('/onboarding');
  };

  return (
    <div className="min-h-dvh px-5 py-8 max-w-sm mx-auto">
      <h1
        className="text-lg font-bold tracking-[3px] text-neon-cyan mb-6"
        style={{ textShadow: '0 0 15px rgba(0,212,255,0.3)' }}
      >
        SETTINGS
      </h1>

      {/* Account Info */}
      <GlassCard className="p-5 mb-4" variant="cyan">
        <h2 className="text-[10px] tracking-[2px] text-hud-white-dim mb-3">ACCOUNT</h2>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] tracking-[1px] text-hud-white-dim">EMAIL</span>
            <span className="text-xs text-hud-white">{user.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] tracking-[1px] text-hud-white-dim">PLAN</span>
            <span className="text-xs text-neon-lime uppercase">{profile?.plan || 'free'}</span>
          </div>
        </div>
      </GlassCard>

      {/* Links */}
      <GlassCard className="p-5 mb-4" variant="cyan">
        <h2 className="text-[10px] tracking-[2px] text-hud-white-dim mb-3">LEGAL</h2>
        <div className="space-y-3">
          <button
            onClick={() => router.push('/privacy')}
            className="w-full text-left text-xs text-hud-white tracking-wide bg-transparent border-none cursor-pointer hover:text-neon-cyan transition-colors"
          >
            プライバシーポリシー
          </button>
          <button
            onClick={() => router.push('/terms')}
            className="w-full text-left text-xs text-hud-white tracking-wide bg-transparent border-none cursor-pointer hover:text-neon-cyan transition-colors"
          >
            利用規約
          </button>
        </div>
      </GlassCard>

      {/* Onboarding Replay */}
      <GlassCard className="p-5 mb-4" variant="cyan">
        <h2 className="text-[10px] tracking-[2px] text-hud-white-dim mb-3">ONBOARDING</h2>
        <button
          onClick={handleReplayOnboarding}
          className="w-full text-xs tracking-[1px] text-neon-cyan bg-transparent border border-[rgba(0,212,255,0.3)] rounded-lg py-2.5 cursor-pointer hover:bg-[rgba(0,212,255,0.1)] transition-colors"
        >
          オンボーディングを再体験する
        </button>
      </GlassCard>

      {/* Sign Out */}
      <div className="mb-8">
        <NeonButton
          onClick={async () => { await signOut(); router.push('/login'); }}
          className="w-full"
        >
          SIGN OUT
        </NeonButton>
      </div>

      {/* Danger Zone */}
      <GlassCard className="p-5 border-[rgba(255,59,122,0.3)]" variant="cyan">
        <h2 className="text-[10px] tracking-[2px] text-neon-magenta mb-3">DANGER ZONE</h2>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-xs tracking-[1px] text-neon-magenta bg-transparent border border-[rgba(255,59,122,0.3)] rounded-lg py-2.5 cursor-pointer hover:bg-[rgba(255,59,122,0.1)] transition-colors"
          >
            アカウントを削除する
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] leading-5 text-hud-white-dim">
              全てのデータ（録音、レポート、アカウント情報）が完全に削除されます。この操作は取り消せません。
            </p>
            <p className="text-[10px] text-neon-magenta">
              確認のため「削除」と入力してください:
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              className="w-full bg-[rgba(255,59,122,0.05)] border border-[rgba(255,59,122,0.3)] rounded-lg px-3 py-2 text-sm text-hud-white tracking-wide focus:outline-none focus:border-neon-magenta"
              placeholder="削除"
            />
            {error && (
              <p className="text-[10px] text-neon-magenta">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); setError(null); }}
                className="flex-1 text-[10px] tracking-[1px] text-hud-white-dim bg-transparent border border-[rgba(232,237,245,0.2)] rounded-lg py-2 cursor-pointer"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== '削除' || deleting}
                className="flex-1 text-[10px] tracking-[1px] text-white rounded-lg py-2 cursor-pointer disabled:opacity-30 transition-opacity"
                style={{ background: 'rgba(255,59,122,0.6)' }}
              >
                {deleting ? '削除中...' : '完全に削除'}
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Version */}
      <div className="mt-6 flex flex-col items-center gap-1">
        <span className="text-[9px] tracking-[2px] text-hud-white-dim select-none">
          Kataru v{APP_VERSION}
        </span>
      </div>

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mt-4 w-full text-[10px] tracking-[2px] text-hud-white-dim bg-transparent border-none cursor-pointer"
      >
        ← 戻る
      </button>
    </div>
  );
}
