'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewSwitchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    checkInIntervalDays: 7,
    gracePeriodDays: 3,
    useVerifiers: false,
    requiredConfirmations: 2,
    verificationWindowDays: 7,
    finalDelayHours: 24,
  });

  useEffect(() => {
    // Check if user is authenticated
    fetch('/api/auth/me').then(res => {
      if (!res.ok) router.push('/auth/login');
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create switch');
      }

      router.push(`/switch/${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create switch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-xl font-bold text-gray-900">
            Final Note
          </Link>
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Create New Switch</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Switch Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Switch Name
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Personal Messages"
            />
            <p className="text-gray-500 text-xs mt-1">A descriptive name for this switch</p>
          </div>

          {/* Check-in Interval */}
          <div>
            <label htmlFor="checkInInterval" className="block text-sm font-medium text-gray-700 mb-2">
              Check-in Interval (days)
            </label>
            <input
              id="checkInInterval"
              type="number"
              min={1}
              max={365}
              value={formData.checkInIntervalDays}
              onChange={(e) => setFormData({ ...formData, checkInIntervalDays: parseInt(e.target.value) || 7 })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-gray-500 text-xs mt-1">How often you need to check in (1-365 days)</p>
          </div>

          {/* Grace Period */}
          <div>
            <label htmlFor="gracePeriod" className="block text-sm font-medium text-gray-700 mb-2">
              Grace Period (days)
            </label>
            <input
              id="gracePeriod"
              type="number"
              min={1}
              max={30}
              value={formData.gracePeriodDays}
              onChange={(e) => setFormData({ ...formData, gracePeriodDays: parseInt(e.target.value) || 3 })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-gray-500 text-xs mt-1">Extra time after missing a check-in before escalation (1-30 days)</p>
          </div>

          {/* Use Verifiers */}
          <div className="border-t pt-6">
            <div className="flex items-start gap-3">
              <input
                id="useVerifiers"
                type="checkbox"
                checked={formData.useVerifiers}
                onChange={(e) => setFormData({ ...formData, useVerifiers: e.target.checked })}
                className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <label htmlFor="useVerifiers" className="block text-sm font-medium text-gray-700">
                  Use Human Verifiers
                </label>
                <p className="text-gray-500 text-xs mt-1">
                  If enabled, trusted verifiers must confirm before messages are sent.
                  If disabled, messages are sent automatically after the grace period.
                </p>
              </div>
            </div>
          </div>

          {/* Verifier Options (conditional) */}
          {formData.useVerifiers && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div>
                <label htmlFor="requiredConfirmations" className="block text-sm font-medium text-gray-700 mb-2">
                  Required Confirmations
                </label>
                <input
                  id="requiredConfirmations"
                  type="number"
                  min={1}
                  max={10}
                  value={formData.requiredConfirmations}
                  onChange={(e) => setFormData({ ...formData, requiredConfirmations: parseInt(e.target.value) || 2 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-gray-500 text-xs mt-1">How many verifiers must confirm (quorum)</p>
              </div>

              <div>
                <label htmlFor="verificationWindow" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Window (days)
                </label>
                <input
                  id="verificationWindow"
                  type="number"
                  min={1}
                  max={30}
                  value={formData.verificationWindowDays}
                  onChange={(e) => setFormData({ ...formData, verificationWindowDays: parseInt(e.target.value) || 7 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-gray-500 text-xs mt-1">How long verifiers have to respond</p>
              </div>
            </div>
          )}

          {/* Final Delay */}
          <div>
            <label htmlFor="finalDelay" className="block text-sm font-medium text-gray-700 mb-2">
              Final Delay (hours)
            </label>
            <input
              id="finalDelay"
              type="number"
              min={1}
              max={168}
              value={formData.finalDelayHours}
              onChange={(e) => setFormData({ ...formData, finalDelayHours: parseInt(e.target.value) || 24 })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-gray-500 text-xs mt-1">Final waiting period before messages are sent (1-168 hours)</p>
          </div>

          {/* Submit */}
          <div className="border-t pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create Switch'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
