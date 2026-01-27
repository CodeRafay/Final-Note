'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface Switch {
  id: string;
  name: string;
  status: string;
  checkInIntervalDays: number;
  gracePeriodDays: number;
  lastCheckInAt: string | null;
  nextCheckInDueAt: string | null;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [switches, setSwitches] = useState<Switch[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [userRes, switchesRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/switch'),
      ]);

      if (!userRes.ok) {
        router.push('/auth/login');
        return;
      }

      const userData = await userRes.json();
      setUser(userData.data.user);

      if (switchesRes.ok) {
        const switchesData = await switchesRes.json();
        setSwitches(switchesData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckIn = async (switchId: string) => {
    setCheckingIn(switchId);
    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ switchId }),
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Check-in failed:', error);
    } finally {
      setCheckingIn(null);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'OVERDUE': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'GRACE_PERIOD': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'PENDING_VERIFICATION': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'VERIFIED': return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'EXECUTED': return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
      case 'CANCELED': return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
      case 'PAUSED': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-xl font-bold text-gray-900">
            Final Note
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.email}</span>
            {user?.role === 'ADMIN' && (
              <Link href="/admin" className="text-blue-600 hover:text-blue-800">
                Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back{user?.name ? `, ${user.name}` : ''}!
          </h1>
          <p className="text-gray-600">Manage your dead man&apos;s switches and messages.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/switch/new"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-6 transition-colors"
          >
            <h3 className="text-lg font-semibold mb-2">Create New Switch</h3>
            <p className="text-blue-100">Set up a new dead man&apos;s switch</p>
          </Link>
          <div className="bg-white rounded-xl p-6 border">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Switches</h3>
            <p className="text-3xl font-bold text-blue-600">
              {switches.filter(s => s.status === 'ACTIVE').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 border">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Needs Attention</h3>
            <p className="text-3xl font-bold text-orange-600">
              {switches.filter(s => ['OVERDUE', 'GRACE_PERIOD'].includes(s.status)).length}
            </p>
          </div>
        </div>

        {/* Switches List */}
        <div className="bg-white rounded-xl border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Your Switches</h2>
          </div>
          
          {switches.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 mb-4">You haven&apos;t created any switches yet.</p>
              <Link
                href="/switch/new"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Your First Switch
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {switches.map((sw) => (
                <div key={sw.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{sw.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(sw.status)}`}>
                        {sw.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 space-x-4">
                      <span>Check-in every {sw.checkInIntervalDays} days</span>
                      <span>•</span>
                      <span>Last check-in: {formatDate(sw.lastCheckInAt)}</span>
                      <span>•</span>
                      <span>Next due: {formatDate(sw.nextCheckInDueAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {['ACTIVE', 'OVERDUE', 'GRACE_PERIOD'].includes(sw.status) && (
                      <button
                        onClick={() => handleCheckIn(sw.id)}
                        disabled={checkingIn === sw.id}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm transition-colors"
                      >
                        {checkingIn === sw.id ? 'Checking in...' : 'Check In'}
                      </button>
                    )}
                    <Link
                      href={`/switch/${sw.id}`}
                      className="px-4 py-2 border border-gray-300 hover:border-gray-400 rounded-lg text-sm text-gray-700 transition-colors"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
