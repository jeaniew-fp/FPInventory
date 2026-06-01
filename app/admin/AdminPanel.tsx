'use client';
import { useState, useTransition } from 'react';
import { inviteUser, updateUserRole } from '@/app/actions/admin';
import toast from 'react-hot-toast';

type Profile = {
  id: string;
  full_name: string;
  role: string;
  created_at: string;
};

const ROLES = ['admin', 'coordinator', 'case_manager'];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  coordinator: 'Coordinator',
  case_manager: 'Case Manager',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  coordinator: 'bg-blue-100 text-blue-700',
  case_manager: 'bg-green-100 text-green-700',
};

export default function AdminPanel({ profiles }: { profiles: Profile[] }) {
  const [localProfiles, setLocalProfiles] = useState(profiles);
  const [isPending, startTransition] = useTransition();

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('case_manager');
  const [inviteLoading, setInviteLoading] = useState(false);

  async function handleRoleChange(userId: string, newRole: string) {
    startTransition(async () => {
      try {
        await updateUserRole(userId, newRole);
        setLocalProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
        toast.success('Role updated');
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    setInviteLoading(true);
    try {
      await inviteUser(inviteEmail.trim(), inviteName.trim(), inviteRole);
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('case_manager');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setInviteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Users list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Team Members</h2>
          <p className="text-xs text-gray-400 mt-0.5">{localProfiles.length} user{localProfiles.length !== 1 ? 's' : ''}</p>
        </div>
        {localProfiles.length === 0 ? (
          <p className="text-gray-400 text-sm px-5 py-6">No users yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {localProfiles.map(profile => (
              <div key={profile.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{profile.full_name}</p>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 font-medium ${ROLE_COLORS[profile.role] ?? 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABELS[profile.role] ?? profile.role}
                  </span>
                </div>
                <div>
                  <select
                    value={profile.role}
                    onChange={e => handleRoleChange(profile.id, e.target.value)}
                    disabled={isPending}
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Invite New User</h2>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="jane@fpgwc.org"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-base bg-white"
            >
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-400">
            The user will receive an email invite with a magic link to set their password.
            After they sign in for the first time, their profile will be created automatically.
          </p>
          <button
            type="submit"
            disabled={inviteLoading}
            className="w-full bg-green-700 text-white py-3 rounded-xl font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors"
          >
            {inviteLoading ? 'Sending invite…' : 'Send Invite Email'}
          </button>
        </form>
      </div>

      {/* Role descriptions */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">Role Permissions</h3>
        <div className="space-y-2 text-sm">
          <div className="flex gap-3">
            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium w-28 text-center shrink-0">Admin</span>
            <span className="text-gray-600">Full access: all features, reports, user management</span>
          </div>
          <div className="flex gap-3">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium w-28 text-center shrink-0">Coordinator</span>
            <span className="text-gray-600">Check in/out donations, view inventory</span>
          </div>
          <div className="flex gap-3">
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium w-28 text-center shrink-0">Case Manager</span>
            <span className="text-gray-600">Check out items to clients, view inventory</span>
          </div>
        </div>
      </div>
    </div>
  );
}
