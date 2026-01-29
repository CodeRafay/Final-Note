'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface SwitchData {
  id: string;
  name: string;
  status: string;
  checkInIntervalDays: number;
  gracePeriodDays: number;
  verificationWindowDays: number;
  finalDelayHours: number;
  useVerifiers: boolean;
  requiredConfirmations: number;
  lastCheckInAt: string | null;
  nextCheckInDueAt: string | null;
  createdAt: string;
}

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

interface Verifier {
  id: string;
  email: string;
  name: string | null;
  status: string;
  createdAt: string;
}

interface Message {
  id: string;
  subject: string | null;
  recipientId: string;
  createdAt: string;
}

export default function SwitchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const switchId = params.id as string;

  const [switchData, setSwitchData] = useState<SwitchData | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [verifiers, setVerifiers] = useState<Verifier[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  // Add recipient form
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [addingRecipient, setAddingRecipient] = useState(false);

  // Add verifier form
  const [showAddVerifier, setShowAddVerifier] = useState(false);
  const [verifierEmail, setVerifierEmail] = useState('');
  const [verifierName, setVerifierName] = useState('');
  const [addingVerifier, setAddingVerifier] = useState(false);

  // Add message form
  const [showAddMessage, setShowAddMessage] = useState(false);
  const [messageRecipientId, setMessageRecipientId] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [addingMessage, setAddingMessage] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [switchRes, recipientsRes, verifiersRes, messagesRes] = await Promise.all([
        fetch(`/api/switch/${switchId}`),
        fetch(`/api/recipients?switchId=${switchId}`),
        fetch(`/api/verifiers?switchId=${switchId}`),
        fetch(`/api/messages?switchId=${switchId}`),
      ]);

      if (!switchRes.ok) {
        if (switchRes.status === 401) {
          router.push('/auth/login');
          return;
        }
        if (switchRes.status === 404) {
          setError('Switch not found');
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch switch data');
      }

      const switchJson = await switchRes.json();
      setSwitchData(switchJson.data);

      if (recipientsRes.ok) {
        const recipientsJson = await recipientsRes.json();
        setRecipients(recipientsJson.data || []);
      }

      if (verifiersRes.ok) {
        const verifiersJson = await verifiersRes.json();
        setVerifiers(verifiersJson.data || []);
      }

      if (messagesRes.ok) {
        const messagesJson = await messagesRes.json();
        setMessages(messagesJson.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load switch data');
    } finally {
      setLoading(false);
    }
  }, [switchId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ switchId }),
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Check-in failed:', err);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingRecipient(true);
    try {
      const response = await fetch('/api/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          switchId,
          email: recipientEmail,
          name: recipientName || undefined,
        }),
      });

      if (response.ok) {
        setRecipientEmail('');
        setRecipientName('');
        setShowAddRecipient(false);
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to add recipient:', err);
    } finally {
      setAddingRecipient(false);
    }
  };

  const handleAddVerifier = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingVerifier(true);
    try {
      const response = await fetch('/api/verifiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          switchId,
          email: verifierEmail,
          name: verifierName || undefined,
        }),
      });

      if (response.ok) {
        setVerifierEmail('');
        setVerifierName('');
        setShowAddVerifier(false);
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to add verifier:', err);
    } finally {
      setAddingVerifier(false);
    }
  };

  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingMessage(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          switchId,
          recipientId: messageRecipientId,
          subject: messageSubject || undefined,
          content: messageContent,
        }),
      });

      if (response.ok) {
        setMessageRecipientId('');
        setMessageSubject('');
        setMessageContent('');
        setShowAddMessage(false);
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to add message:', err);
    } finally {
      setAddingMessage(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700 border-green-200';
      case 'OVERDUE': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'GRACE_PERIOD': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'PENDING_VERIFICATION': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'VERIFIED': return 'bg-red-100 text-red-700 border-red-200';
      case 'EXECUTED': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'CANCELED': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'PAUSED': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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

  if (error && !switchData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error}</p>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-500">
            ← Back to Dashboard
          </Link>
        </div>
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
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Switch Header */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{switchData?.name}</h1>
              <span className={`text-sm px-3 py-1 rounded-full border ${getStatusColor(switchData?.status || '')}`}>
                {switchData?.status.replace('_', ' ')}
              </span>
            </div>
            {switchData && ['ACTIVE', 'OVERDUE', 'GRACE_PERIOD'].includes(switchData.status) && (
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors"
              >
                {checkingIn ? 'Checking in...' : 'Check In Now'}
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Check-in Interval:</span>
              <span className="ml-2 text-gray-900">{switchData?.checkInIntervalDays} days</span>
            </div>
            <div>
              <span className="text-gray-500">Grace Period:</span>
              <span className="ml-2 text-gray-900">{switchData?.gracePeriodDays} days</span>
            </div>
            <div>
              <span className="text-gray-500">Final Delay:</span>
              <span className="ml-2 text-gray-900">{switchData?.finalDelayHours} hours</span>
            </div>
            <div>
              <span className="text-gray-500">Last Check-in:</span>
              <span className="ml-2 text-gray-900">{formatDate(switchData?.lastCheckInAt || null)}</span>
            </div>
            <div>
              <span className="text-gray-500">Next Due:</span>
              <span className="ml-2 text-gray-900">{formatDate(switchData?.nextCheckInDueAt || null)}</span>
            </div>
            <div>
              <span className="text-gray-500">Human Verification:</span>
              <span className="ml-2 text-gray-900">{switchData?.useVerifiers ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </div>

        {/* Recipients Section */}
        <div className="bg-white rounded-xl border mb-6">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recipients</h2>
            <button
              onClick={() => setShowAddRecipient(!showAddRecipient)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              + Add Recipient
            </button>
          </div>

          {showAddRecipient && (
            <form onSubmit={handleAddRecipient} className="p-6 border-b bg-gray-50">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="recipient@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addingRecipient}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm"
                >
                  {addingRecipient ? 'Adding...' : 'Add Recipient'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddRecipient(false)}
                  className="px-4 py-2 border border-gray-300 hover:border-gray-400 rounded-lg text-sm text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {recipients.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No recipients yet. Add recipients who will receive your messages.
            </div>
          ) : (
            <div className="divide-y">
              {recipients.map((recipient) => (
                <div key={recipient.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{recipient.name || recipient.email}</p>
                    {recipient.name && <p className="text-sm text-gray-500">{recipient.email}</p>}
                  </div>
                  <span className="text-xs text-gray-400">Added {formatDate(recipient.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verifiers Section (only if useVerifiers is enabled) */}
        {switchData?.useVerifiers && (
          <div className="bg-white rounded-xl border mb-6">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Human Verifiers</h2>
                <p className="text-sm text-gray-500">
                  Required confirmations: {switchData.requiredConfirmations}
                </p>
              </div>
              <button
                onClick={() => setShowAddVerifier(!showAddVerifier)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                + Add Verifier
              </button>
            </div>

            {showAddVerifier && (
              <form onSubmit={handleAddVerifier} className="p-6 border-b bg-gray-50">
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={verifierEmail}
                      onChange={(e) => setVerifierEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="verifier@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
                    <input
                      type="text"
                      value={verifierName}
                      onChange={(e) => setVerifierName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Jane Smith"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={addingVerifier}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm"
                  >
                    {addingVerifier ? 'Adding...' : 'Add Verifier'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddVerifier(false)}
                    className="px-4 py-2 border border-gray-300 hover:border-gray-400 rounded-lg text-sm text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {verifiers.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No verifiers yet. Add trusted people who can verify your status.
              </div>
            ) : (
              <div className="divide-y">
                {verifiers.map((verifier) => (
                  <div key={verifier.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{verifier.name || verifier.email}</p>
                      {verifier.name && <p className="text-sm text-gray-500">{verifier.email}</p>}
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full border ${
                        verifier.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {verifier.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages Section */}
        <div className="bg-white rounded-xl border">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
            <button
              onClick={() => setShowAddMessage(!showAddMessage)}
              disabled={recipients.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm transition-colors"
            >
              + Add Message
            </button>
          </div>

          {showAddMessage && (
            <form onSubmit={handleAddMessage} className="p-6 border-b bg-gray-50">
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient *</label>
                  <select
                    value={messageRecipientId}
                    onChange={(e) => setMessageRecipientId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a recipient</option>
                    {recipients.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name || r.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject (optional)</label>
                  <input
                    type="text"
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Message subject"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Write your message here..."
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addingMessage}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm"
                >
                  {addingMessage ? 'Adding...' : 'Add Message'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMessage(false)}
                  className="px-4 py-2 border border-gray-300 hover:border-gray-400 rounded-lg text-sm text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {recipients.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Add recipients first before creating messages.
            </div>
          ) : messages.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No messages yet. Create messages for your recipients.
            </div>
          ) : (
            <div className="divide-y">
              {messages.map((message) => {
                const recipient = recipients.find(r => r.id === message.recipientId);
                return (
                  <div key={message.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {message.subject || 'No subject'}
                      </p>
                      <p className="text-sm text-gray-500">
                        To: {recipient?.name || recipient?.email || 'Unknown'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      Created {formatDate(message.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
