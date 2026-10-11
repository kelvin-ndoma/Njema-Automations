'use client';
import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { safeDestination } from '@/server/landing-policy';
import { authErrorMessage } from '@/lib/auth-error';
import { Input } from './ui/input';
import { Button } from './ui/button';
const schema = z.object({
  name: z.string().trim().max(80),
  email: z.email(),
  password: z.string().min(12, 'Use at least 12 characters').max(128),
});
export function AuthForm({ signup = false, next }: { signup?: boolean; next?: string }) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });
  const submit = handleSubmit(async (values) => {
    setError('');
    if (signup && values.name.length < 2) {
      setError('Enter your name (at least 2 characters).');
      return;
    }
    try {
      const result = signup
        ? await authClient.signUp.email(values)
        : await authClient.signIn.email({ email: values.email, password: values.password });
      if (result.error) {
        setError(authErrorMessage(result.error.status, signup));
        return;
      }
      const destination = safeDestination(next);
      router.replace(
        '/auth/continue' + (destination ? '?next=' + encodeURIComponent(destination) : ''),
      );
      router.refresh();
    } catch {
      setError('Unable to connect. Please try again.');
    }
  });
  return (
    <form method="post" onSubmit={submit} className="space-y-5" noValidate>
      {signup && (
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium">
            Your name
          </label>
          <Input id="name" autoComplete="name" {...register('name')} />
        </div>
      )}
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium">
          Work email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          aria-invalid={!!errors.email}
        />
        {errors.email && <p className="mt-1 text-sm text-red-700">Enter a valid email address.</p>}
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete={signup ? 'new-password' : 'current-password'}
          {...register('password')}
          aria-invalid={!!errors.password}
        />
        {errors.password && <p className="mt-1 text-sm text-red-700">{errors.password.message}</p>}
        {signup && (
          <p className="mt-2 text-xs text-muted-foreground">
            At least 12 characters. Make it unique to this account.
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <Button className="w-full" disabled={isSubmitting || !hydrated}>
        {isSubmitting ? (
          <LoaderCircle size={16} className="animate-spin" />
        ) : (
          <ArrowRight size={16} />
        )}{' '}
        {signup ? 'Create account' : 'Sign in'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {signup ? 'Already have an account?' : 'New to Relay?'}{' '}
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href={
            (signup ? '/sign-in' : '/sign-up') +
            (safeDestination(next) ? '?next=' + encodeURIComponent(next!) : '')
          }
        >
          {signup ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </form>
  );
}
