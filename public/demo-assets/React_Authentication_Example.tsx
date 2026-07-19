import React, { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';

export function LoginButton() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signIn('demo@example.com', 'password123');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleLogin} disabled={loading}>
      {loading ? 'Signing in...' : 'Sign In'}
    </button>
  );
}
