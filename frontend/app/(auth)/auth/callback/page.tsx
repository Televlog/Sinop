'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import { useAuthStore } from '@/store/auth.store';
import { Loader2 } from 'lucide-react';

function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const { fetchMe } = useAuthStore();

  useEffect(() => {
    const token = params.get('token');
    const refresh = params.get('refresh');
    if (token && refresh) {
      Cookies.set('access_token', token, { expires: 1/96, sameSite: 'lax' });
      Cookies.set('refresh_token', refresh, { expires: 7, sameSite: 'lax' });
      fetchMe().then(() => router.replace('/'));
    } else {
      router.replace('/login?error=oauth_failed');
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-primary-600" size={40} />
      <p className="text-gray-500">Completing sign in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary-600" size={40} />
        <p className="text-gray-500">Completing sign in...</p>
      </div>
    }>
      <AuthCallback />
    </Suspense>
  );
}
