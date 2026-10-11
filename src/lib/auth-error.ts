export function authErrorMessage(status: number, signup: boolean) {
  if (status === 429) return 'Too many attempts. Please wait a minute.';
  if (status === 403)
    return 'This application address isn’t enabled for sign-in. Use the configured application address.';
  if (status >= 500) return 'Sign-in service unavailable. Please try again shortly.';
  return signup
    ? 'Could not create your account. Check your details or try signing in.'
    : 'Could not sign in. Check your email and password.';
}
