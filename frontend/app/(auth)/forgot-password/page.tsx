'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Loader2, CheckCircle } from 'lucide-react';
import { authApi, getErrorMessage } from '@/lib/api';

const schema = z.object({ email: z.string().email('Invalid email') });

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: any) => {
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch {
      setSent(true); // Don't reveal if email exists
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="text-green-600" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check your email</h1>
        <p className="text-gray-500 mb-6">If an account exists, a password reset link has been sent.</p>
        <Link href="/login" className="btn-primary inline-block px-8 py-3">Back to login</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reset password</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Enter your email to receive a reset link.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input {...register('email')} type="email" placeholder="you@example.com" className="input-field" />
          {errors.email && <p className="text-red-500 text-sm mt-1">{(errors.email as any).message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Send reset link
        </button>
        <div className="text-center">
          <Link href="/login" className="text-sm text-primary-600 hover:text-primary-700">Back to login</Link>
        </div>
      </form>
    </div>
  );
}
