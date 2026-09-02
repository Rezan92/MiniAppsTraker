import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { 
  useTeamMembers, 
  usePendingInvitations, 
  useRevokeInvitation, 
  useUpdateMemberRole, 
  useRemoveMember 
} from '../../hooks/api/useTeam';
import { InviteMemberModal } from './InviteMemberModal';
import { ConfirmModal } from '../common/ConfirmModal';

export const TeamManagement = () => {
  const { userData } = useAuth();
  const { showSuccess } = useToast();
  const tenantId = userData?.tenant_id;
  const currentUserId = userData?.id;

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [inviteToRevoke, setInviteToRevoke] = useState(null);

  const { data: members = [], isLoading: loadingMembers } = useTeamMembers(tenantId);
  const { data: invitations = [], isLoading: loadingInvites } = usePendingInvitations(tenantId);

  const revokeMutation = useRevokeInvitation();
  const updateRoleMutation = useUpdateMemberRole();
  const removeMemberMutation = useRemoveMember();

  const handleRoleChange = (userId, newRole) => {
    if (!tenantId) return;
    updateRoleMutation.mutate({ tenantId, userId, role: newRole });
  };

  const handleConfirmRemove = () => {
    if (!memberToRemove || !tenantId) return;
    removeMemberMutation.mutate(
      { tenantId, userId: memberToRemove.user_id },
      {
        onSuccess: () => setMemberToRemove(null)
      }
    );
  };

  const handleConfirmRevoke = () => {
    if (!inviteToRevoke) return;
    revokeMutation.mutate(inviteToRevoke.id, {
      onSuccess: () => setInviteToRevoke(null)
    });
  };

  const copyInviteLink = (url) => {
    navigator.clipboard.writeText(url);
    showSuccess('Invitation link copied to clipboard!');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-headline-md text-primary tracking-tight mb-1">Team Management</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Manage your organization members, invite new teammates, and assign roles.
          </p>
        </div>
        <button 
          onClick={() => setInviteModalOpen(true)}
          className="bg-primary text-on-primary font-title-sm py-2.5 px-5 rounded-DEFAULT hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person_add</span>
          <span>Invite Team Member</span>
        </button>
      </div>

      {/* Active Team Section */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline-variant flex items-center justify-between">
          <div>
            <h3 className="font-title-md text-title-md text-on-surface">Active Members</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Teammates who currently have access to this workspace</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-surface-container-high text-on-surface-variant rounded-full">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        {loadingMembers ? (
          <div className="p-8 text-center text-on-surface-variant flex items-center justify-center gap-2">
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
            <span>Loading team members...</span>
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant">No active members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-xs uppercase tracking-wider border-b border-outline-variant">
                  <th className="py-3.5 px-6">Member</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Joined Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-body-md text-on-surface">
                {members.map((member) => {
                  const isSelf = member.user_id === currentUserId;
                  const initials = (member.name || member.email || '?')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr key={member.membership_id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-title-sm text-on-surface flex items-center gap-2">
                              <span>{member.name}</span>
                              {isSelf && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary/20 text-primary rounded">You</span>
                              )}
                            </div>
                            <div className="text-xs text-on-surface-variant">{member.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {isSelf ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            member.role === 'admin' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {member.role === 'admin' ? 'Administrator' : 'Employee'}
                          </span>
                        ) : (
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                            disabled={updateRoleMutation.isPending}
                            className="text-xs px-2.5 py-1.5 border border-outline-variant rounded bg-surface-container-lowest font-medium text-on-surface focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50"
                          >
                            <option value="employee">Employee</option>
                            <option value="admin">Administrator</option>
                          </select>
                        )}
                      </td>

                      <td className="py-4 px-6 text-xs text-on-surface-variant">
                        {formatDate(member.joined_at)}
                      </td>

                      <td className="py-4 px-6 text-right">
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => setMemberToRemove(member)}
                            className="p-1.5 text-on-surface-variant hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Remove member"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person_remove</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Invitations Section */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline-variant flex items-center justify-between">
          <div>
            <h3 className="font-title-md text-title-md text-on-surface">Pending Invitations</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Invited teammates who have not yet accepted their invitation</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-surface-container-high text-on-surface-variant rounded-full">
            {invitations.length} {invitations.length === 1 ? 'invite' : 'invites'}
          </span>
        </div>

        {loadingInvites ? (
          <div className="p-8 text-center text-on-surface-variant flex items-center justify-center gap-2">
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
            <span>Loading invitations...</span>
          </div>
        ) : invitations.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-sm">
            No pending invitations. Click <strong>"Invite Team Member"</strong> above to send one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-xs uppercase tracking-wider border-b border-outline-variant">
                  <th className="py-3.5 px-6">Invitee Email</th>
                  <th className="py-3.5 px-6">Target Role</th>
                  <th className="py-3.5 px-6">Sent Date</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-body-md text-on-surface">
                {invitations.map((invite) => {
                  const isExpired = invite.status === 'expired' || (invite.expires_at && new Date(invite.expires_at) < new Date());

                  return (
                    <tr key={invite.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-title-sm text-on-surface">{invite.email}</div>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          invite.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {invite.role === 'admin' ? 'Admin' : 'Employee'}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-xs text-on-surface-variant">
                        {formatDate(invite.created_at)}
                      </td>

                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          isExpired 
                            ? 'bg-gray-100 text-gray-700' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isExpired ? 'Expired' : 'Pending'}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isExpired && invite.joinUrl && (
                            <button
                              type="button"
                              onClick={() => copyInviteLink(invite.joinUrl)}
                              className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded transition-colors cursor-pointer"
                              title="Copy invitation link"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>content_copy</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setInviteToRevoke(invite)}
                            className="p-1.5 text-on-surface-variant hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Revoke invitation"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <InviteMemberModal 
        isOpen={inviteModalOpen} 
        onClose={() => setInviteModalOpen(false)} 
      />

      <ConfirmModal
        open={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleConfirmRemove}
        title="Remove Team Member?"
        message={`Are you sure you want to remove ${memberToRemove?.name || memberToRemove?.email} from this workspace? They will lose access to all workspace data immediately.`}
        confirmText="Remove Member"
        confirmColor="red"
      />

      <ConfirmModal
        open={!!inviteToRevoke}
        onClose={() => setInviteToRevoke(null)}
        onConfirm={handleConfirmRevoke}
        title="Revoke Invitation?"
        message={`Are you sure you want to revoke the invitation sent to ${inviteToRevoke?.email}? This link will become invalid immediately.`}
        confirmText="Revoke"
        confirmColor="red"
      />
    </div>
  );
};
