'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AdminGuard from '@/components/admin/AdminGuard';
import Card from '@/components/ui/Card';
import AmbientBackground from '@/components/ui/AmbientBackground';
import Button from '@/components/ui/Button';
import DiffViewer from '@/components/admin/DiffViewer';
import { getAllSchemes } from '@/lib/firestore/schemes';
import {
  getPendingUpdates,
  getAllUpdateHistory,
  approveSchemeUpdate,
  rejectSchemeUpdate,
} from '@/lib/firestore/admin';
import { collection, getDocs, query, limit, startAfter, type DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getErrorMessage } from '@/lib/utils/errors';
import type { Scheme, SchemeUpdateRecord, UserProfile } from '@/types';

const ADMIN_ROUTE_KEY = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

export default function AdminDashboardClient() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'schemes' | 'proposals' | 'users'>('schemes');
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<SchemeUpdateRecord[]>([]);
  const [history, setHistory] = useState<SchemeUpdateRecord[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [lastUserDoc, setLastUserDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Selected update for diff view
  const [expandedUpdateId, setExpandedUpdateId] = useState<string | null>(null);

  // Admin User Deletion Modal
  const [targetUserToDelete, setTargetUserToDelete] = useState<{ uid: string; email: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState('');
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const [allSchemes, pending, allHistory] = await Promise.all([
        getAllSchemes(),
        getPendingUpdates(),
        getAllUpdateHistory(),
      ]);
      setSchemes(allSchemes);
      setPendingUpdates(pending);
      setHistory(allHistory);

      // Load initial page of users for User Governance (25 at a time)
      const usersQuery = query(collection(db, 'users'), limit(26));
      const usersSnap = await getDocs(usersQuery);
      const rawUserDocs = usersSnap.docs;
      const more = rawUserDocs.length > 25;
      const pagedDocs = more ? rawUserDocs.slice(0, 25) : rawUserDocs;

      const uList: UserProfile[] = [];
      pagedDocs.forEach((d) => {
        uList.push({ uid: d.id, ...d.data() } as UserProfile);
      });
      setUsersList(uList);
      setLastUserDoc(pagedDocs.length > 0 ? pagedDocs[pagedDocs.length - 1] : null);
      setHasMoreUsers(more);
    } catch (err) {
      console.error('Error loading admin dashboard data:', err);
    }
  };

  const handleLoadMoreUsers = async () => {
    if (!lastUserDoc || loadingMoreUsers) return;
    setLoadingMoreUsers(true);
    try {
      const nextQuery = query(collection(db, 'users'), startAfter(lastUserDoc), limit(26));
      const snap = await getDocs(nextQuery);
      const raw = snap.docs;
      const more = raw.length > 25;
      const paged = more ? raw.slice(0, 25) : raw;

      const nextList: UserProfile[] = [];
      paged.forEach((d) => {
        nextList.push({ uid: d.id, ...d.data() } as UserProfile);
      });

      setUsersList((prev) => [...prev, ...nextList]);
      setLastUserDoc(paged.length > 0 ? paged[paged.length - 1] : null);
      setHasMoreUsers(more);
    } catch (err) {
      console.error('Error loading more users:', err);
    } finally {
      setLoadingMoreUsers(false);
    }
  };

  // Firestore data fetch on mount — setState calls happen after the awaited
  // reads resolve, not synchronously in the effect body.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const handleApprove = async (update: SchemeUpdateRecord) => {
    if (!user) return;
    setActionLoading(update.id);
    try {
      await approveSchemeUpdate(
        update.id,
        user.uid,
        user.email || 'admin@arthasetu.app'
      );
      await loadData();
    } catch (err) {
      console.error('Error approving update:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (updateId: string) => {
    setActionLoading(updateId);
    try {
      await rejectSchemeUpdate(updateId, 'Rejected by administrative reviewer');
      await loadData();
    } catch (err) {
      console.error('Error rejecting update:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdminDeleteUser = async () => {
    if (!user || !targetUserToDelete) return;
    setDeleteLoading(true);
    setDeleteErrorMsg('');
    setDeleteSuccessMsg('');

    try {
      // Force refresh the token before mutating admin API call
      let idToken = await user.getIdToken(true);
      let res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          targetUid: targetUserToDelete.uid,
          targetEmail: targetUserToDelete.email,
        }),
      });

      // If token had a transient issue, attempt one retry with forced refresh
      if (res.status === 401 || res.status === 403) {
        idToken = await user.getIdToken(true);
        res = await fetch('/api/admin/users/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            targetUid: targetUserToDelete.uid,
            targetEmail: targetUserToDelete.email,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete user');
      }

      setDeleteSuccessMsg(`User ${targetUserToDelete.email} and all data were successfully erased.`);
      setTargetUserToDelete(null);
      await loadData();
      setTimeout(() => setDeleteSuccessMsg(''), 6000);
    } catch (err) {
      console.error('Admin user deletion failed:', err);
      setDeleteErrorMsg(getErrorMessage(err, 'Deletion failed.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <AdminGuard>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 pt-28 pb-8 space-y-8 animate-fade-in">
        {/* Admin Header */}
        <div className="relative overflow-hidden rounded-2xl p-6 bg-surface-elevated/60 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <AmbientBackground variant="subtle" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-navy-600 text-white dark:bg-navy-400 dark:text-navy-950 uppercase tracking-wider">
                🛡️ {t.adminNav.badge} Console
              </span>
              <span className="text-xs text-muted">
                Scheme Governance & User Administration
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              {t.admin.portalTitle}
            </h1>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <Link
              href={`/${ADMIN_ROUTE_KEY}/admin/schemes/new`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm"
            >
              <span>➕</span>
              <span>{t.admin.draftNewScheme}</span>
            </Link>
          </div>
        </div>

        {/* Dismissible Feedback Alerts */}
        {deleteSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span className="font-bold">{deleteSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setDeleteSuccessMsg('')}
              className="text-emerald-700 dark:text-emerald-300 hover:opacity-75 font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}
        {deleteErrorMsg && !targetUserToDelete && (
          <div className="p-4 rounded-2xl bg-danger-light border border-danger/30 text-danger text-xs flex items-center justify-between gap-2 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span className="font-bold">{deleteErrorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setDeleteErrorMsg('')}
              className="text-danger hover:opacity-75 font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card padding="md" className="space-y-1">
            <span className="text-xs text-muted font-medium">{t.admin.publishedSchemes}</span>
            <p className="text-2xl font-black text-foreground">{schemes.length}</p>
          </Card>
          <Card padding="md" className="space-y-1">
            <span className="text-xs text-muted font-medium">{t.admin.pendingProposals}</span>
            <p className="text-2xl font-black text-saffron-600">{pendingUpdates.length}</p>
          </Card>
          <Card padding="md" className="space-y-1">
            <span className="text-xs text-muted font-medium">{t.admin.auditEntries}</span>
            <p className="text-2xl font-black text-foreground">{history.length}</p>
          </Card>
          <Card padding="md" className="space-y-1">
            <span className="text-xs text-muted font-medium">{t.admin.registeredUsers}</span>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{usersList.length}</p>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('schemes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'schemes'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface text-muted hover:text-foreground'
            }`}
          >
            🏛️ {t.admin.liveSchemesTab} ({schemes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('proposals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'proposals'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface text-muted hover:text-foreground'
            }`}
          >
            📋 {t.admin.reviewQueueTab} ({pendingUpdates.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface text-muted hover:text-foreground'
            }`}
          >
            👥 {t.admin.userManagementTab} ({usersList.length})
          </button>
        </div>

        {/* TAB 1: SCHEMES LIST */}
        {activeTab === 'schemes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Verified Schemes Directory</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {schemes.map((scheme) => (
                <Card key={scheme.id} padding="md" className="space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-navy-100 dark:bg-navy-900 text-navy-800 dark:text-navy-200 border border-navy-200 dark:border-navy-700">
                        {scheme.governmentLevel === 'central' ? '🇮🇳 Central' : `🏛️ ${scheme.state}`}
                      </span>
                      <span className="text-[10px] text-muted">{scheme.category}</span>
                    </div>
                    <h3 className="font-bold text-sm text-foreground mt-2 line-clamp-1">{scheme.name}</h3>
                    <p className="text-xs text-muted line-clamp-2 mt-1">{scheme.description}</p>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] text-muted">ID: {scheme.id}</span>
                    <Link
                      href={`/${ADMIN_ROUTE_KEY}/admin/schemes/${scheme.id}/edit`}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      AI Edit / Propose →
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: PROPOSALS REVIEW QUEUE */}
        {activeTab === 'proposals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Pending Policy & Scheme Proposals</h2>
            </div>

            {pendingUpdates.length > 0 ? (
              <div className="space-y-4">
                {pendingUpdates.map((update) => {
                  const isExpanded = expandedUpdateId === update.id;
                  return (
                    <Card key={update.id} padding="lg" className="space-y-4 border-l-4 border-l-saffron-500">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-saffron-100 dark:bg-saffron-900/50 text-saffron-800 dark:text-saffron-300">
                              Pending Review
                            </span>
                            <span className="font-bold text-sm text-foreground">
                              {update.schemeName || update.schemeId}
                            </span>
                          </div>

                          <div className="text-[11px] text-muted flex items-center gap-3">
                            <span>👤 Proposed by: {update.adminEmail}</span>
                            {update.sourceUrl && (
                              <a
                                href={update.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline truncate max-w-[200px]"
                              >
                                🔗 Source Notification
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedUpdateId(isExpanded ? null : update.id)}
                          >
                            {isExpanded ? 'Hide Diff' : 'Inspect Diff'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(update.id)}
                            isLoading={actionLoading === update.id}
                            className="text-danger border-danger/30 hover:bg-danger-light"
                          >
                            Reject
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleApprove(update)}
                            isLoading={actionLoading === update.id}
                            className="bg-success text-white hover:bg-success/90"
                          >
                            Approve & Publish Live
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="pt-4 border-t border-border">
                          <DiffViewer proposedChanges={update.proposedChanges} schemeName={update.schemeName} />
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-surface border border-dashed border-border text-center space-y-2">
                <span className="text-2xl block">🎉</span>
                <p className="text-sm font-semibold text-foreground">Review queue is empty!</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: USER MANAGEMENT & DELETION */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">User Governance & Account Deletion</h2>
                <p className="text-xs text-muted">
                  Administrative controls to view users and perform authorized account erasures
                </p>
              </div>
            </div>

            <div className="bg-surface-elevated border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface border-b border-border text-muted font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3.5">User</th>
                      <th className="p-3.5">Location</th>
                      <th className="p-3.5">Business</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {usersList.map((u) => (
                      <tr key={u.uid} className="hover:bg-surface/50 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-foreground">{u.name || 'Unnamed User'}</div>
                          <div className="text-muted text-[11px] font-mono">{u.email || u.uid}</div>
                        </td>
                        <td className="p-3.5 text-muted">
                          {u.locality ? `${u.locality}, ` : ''}{u.state || 'N/A'}
                        </td>
                        <td className="p-3.5">
                          <span className="font-medium text-foreground">{u.businessType || 'N/A'}</span>
                          <span className="block text-[10px] text-muted">{u.businessCategory || ''}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
                            Active
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setTargetUserToDelete({ uid: u.uid, email: u.email || u.uid })}
                            className="px-2.5 py-1 rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-white text-xs font-bold transition-all cursor-pointer"
                          >
                            🗑️ Delete User
                          </button>
                        </td>
                      </tr>
                    ))}
                    {usersList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted">
                          No registered user profiles found in Firestore.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {hasMoreUsers && (
                <div className="p-4 border-t border-border flex justify-center bg-surface/30">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    isLoading={loadingMoreUsers}
                    onClick={handleLoadMoreUsers}
                    className="rounded-xl text-xs"
                  >
                    Load More Users
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin User Deletion Confirmation Modal */}
        {targetUserToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-surface-elevated border border-danger/30 rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-danger/10 text-danger flex items-center justify-center text-xl shrink-0">
                  🛡️
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Admin User Account Erasure
                  </h3>
                  <p className="text-xs text-muted">
                    Permanently delete user and log to admin audit trail
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-danger-light/30 border border-danger/20 text-xs text-danger-dark dark:text-danger space-y-1.5">
                <p className="font-bold">Target Account:</p>
                <p className="font-mono text-foreground font-semibold">{targetUserToDelete.email} (UID: {targetUserToDelete.uid})</p>
                <p className="pt-1 opacity-90">
                  This server-side action will permanently wipe their Firestore documents across all collections, delete their Firebase Auth login account, and record an audit log in <code>adminActions</code>.
                </p>
              </div>

              {deleteErrorMsg && (
                <div className="p-3 rounded-xl bg-danger-light border border-danger/30 text-danger text-xs flex items-center gap-2">
                  <span>⚠️</span>
                  <span className="font-bold">{deleteErrorMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={deleteLoading}
                  onClick={() => setTargetUserToDelete(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  isLoading={deleteLoading}
                  onClick={handleAdminDeleteUser}
                  className="shadow-md"
                >
                  Confirm & Delete Target User
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </AdminGuard>
  );
}
