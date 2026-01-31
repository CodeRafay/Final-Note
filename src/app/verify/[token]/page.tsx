'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface TokenDetails {
  valid: boolean;
  verifierName?: string | null;
  verifierEmail?: string;
  ownerName?: string | null;
  switchName?: string;
  expiresAt?: string;
  alreadyUsed?: boolean;
  alreadyVoted?: boolean;
}

export default function VerifyPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null);
  const [otp, setOtp] = useState('');
  const [vote, setVote] = useState<'CONFIRM' | 'DENY' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTokenDetails() {
      try {
        const response = await fetch(`/api/verify?token=${token}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          setTokenDetails(data.data);
        } else {
          setError(data.error || 'Invalid or expired verification link');
        }
      } catch {
        setError('Failed to load verification details');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchTokenDetails();
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vote) {
      setError('Please select to confirm or deny');
      return;
    }
    
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          otp,
          vote,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        setResult(data.data.result);
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch {
      setError('Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-800/50 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">
            Verification Submitted
          </h1>
          <p className="text-gray-300 mb-4">
            Your verification vote has been recorded.
          </p>
          {result && (
            <div className={`p-4 rounded-lg mb-6 ${
              result === 'confirmed' ? 'bg-red-900/50 border border-red-700' :
              result === 'denied' ? 'bg-blue-900/50 border border-blue-700' :
              'bg-gray-700/50 border border-gray-600'
            }`}>
              <p className="text-white">
                {result === 'confirmed' && 'Verification has been confirmed. Final messages will be delivered.'}
                {result === 'denied' && 'Verification has been denied. The switch has been paused.'}
                {result === 'pending' && 'Your vote has been recorded. Waiting for more verifications.'}
              </p>
            </div>
          )}
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  if (!tokenDetails || !tokenDetails.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-800/50 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">✕</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">
            Invalid Verification Link
          </h1>
          <p className="text-gray-300 mb-6">
            {tokenDetails?.alreadyUsed ? 'This verification link has already been used.' :
             tokenDetails?.alreadyVoted ? 'You have already submitted your vote.' :
             error || 'This link is invalid or has expired.'}
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-gray-800/50 rounded-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Verification Required</h1>
          <p className="text-gray-400">
            You have been asked to verify the status of{' '}
            <span className="text-white font-semibold">{tokenDetails.ownerName}</span>
          </p>
        </div>

        {/* Information Box */}
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-8">
          <p className="text-yellow-200 text-sm">
            <strong>Important:</strong> Only confirm if you have independently verified that{' '}
            {tokenDetails.ownerName} is deceased or permanently incapacitated.
          </p>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* OTP Input */}
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-2">
              Enter the 6-digit verification code from your email
            </label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(value);
                setError('');
              }}
              placeholder="000000"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={6}
              pattern="\d{6}"
              required
            />
          </div>

          {/* Vote Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Your Verification Decision
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setVote('CONFIRM');
                  setError('');
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  vote === 'CONFIRM'
                    ? 'bg-red-900/50 border-red-500 text-red-200'
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="text-2xl mb-2">⚠️</div>
                <div className="font-semibold">Confirm</div>
                <div className="text-xs mt-1 opacity-75">
                  I verify the status
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setVote('DENY');
                  setError('');
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  vote === 'DENY'
                    ? 'bg-blue-900/50 border-blue-500 text-blue-200'
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="text-2xl mb-2">✋</div>
                <div className="font-semibold">Deny</div>
                <div className="text-xs mt-1 opacity-75">
                  Cannot verify status
                </div>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !vote || otp.length !== 6}
            className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
              submitting || !vote || otp.length !== 6
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {submitting ? 'Submitting...' : 'Submit Verification'}
          </button>
        </form>

        {/* Expiration Notice */}
        {tokenDetails.expiresAt && (
          <p className="text-center text-gray-500 text-sm mt-6">
            This verification expires on{' '}
            {new Date(tokenDetails.expiresAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
