// Only implemented, local routes can be carried through authentication.
export function safeDestination(value?: string): string | null {
  if (
    !value ||
    value.length > 2048 ||
    /[\\\x00-\x20]/.test(value) ||
    !value.startsWith('/') ||
    value.startsWith('//')
  )
    return null;
  const url = new URL(value, 'https://local.invalid');
  if (url.origin !== 'https://local.invalid') return null;
  const path = url.pathname;
  if (
    /^\/platform(?:\/(?:organizations|users)(?:\/[a-fA-F0-9]{24})?|\/security(?:\/(?:identity|organization|platform):[a-fA-F0-9]{24})?|\/(?:billing|ai|health|settings|account|operators)|\/support(?:\/(?:access\/)?[a-fA-F0-9]{24})?)?$/.test(
      path,
    ) ||
    /^\/app\/[a-z0-9-]+(?:\/(?:employee|settings|test-chat|widget(?:\/preview)?|inbox))?$/.test(
      path,
    ) ||
    ['/account', '/organizations', '/organizations/new'].includes(path)
  )
    return path + url.search + url.hash;
  return null;
}
export function chooseLanding(
  platform: boolean,
  slugs: string[],
  requested?: string,
  saved?: string,
): string {
  const destination = safeDestination(requested);
  if (destination) {
    const path = destination.split(/[?#]/)[0];
    if (
      path.startsWith('/platform')
        ? platform
        : path.startsWith('/app/')
          ? slugs.includes(path.split('/')[2])
          : true
    )
      return destination;
  }
  if (platform) return '/platform';
  if (!slugs.length) return '/organizations/new';
  if (slugs.length === 1) return `/app/${slugs[0]}`;
  if (saved && slugs.includes(saved)) return `/app/${saved}`;
  return '/organizations';
}
