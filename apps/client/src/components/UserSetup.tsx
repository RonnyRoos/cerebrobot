/**
 * UserSetup Component
 *
 * Prompts user for name on first visit and persists userId to localStorage.
 */

import { useState, useEffect } from 'react';
import type { CreateUserResponse } from '@cerebrobot/chat-shared';

const USER_ID_KEY = 'cerebrobot_userId';

interface UserSetupProps {
  onUserIdReady: (userId: string) => void;
}

export function UserSetup({ onUserIdReady }: UserSetupProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingStorage, setCheckingStorage] = useState(true);

  useEffect(() => {
    // Check localStorage for existing userId
    const existingUserId = localStorage.getItem(USER_ID_KEY);

    if (existingUserId) {
      onUserIdReady(existingUserId);
    } else {
      setCheckingStorage(false);
    }
  }, [onUserIdReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create user: ${response.statusText}`);
      }

      const data: CreateUserResponse = await response.json();

      // Store userId in localStorage
      localStorage.setItem(USER_ID_KEY, data.userId);

      // Notify parent component
      onUserIdReady(data.userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
      setLoading(false);
    }
  };

  if (checkingStorage) {
    return (
      <div className="user-setup">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="user-setup">
      <div className="user-setup-card">
        <h2>Welcome to Cerebrobot</h2>
        <p>
          Please enter your name to get started. This will be used to remember your preferences
          across conversations.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (e.g., operator, demo, test)"
            disabled={loading}
            maxLength={100}
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
}
