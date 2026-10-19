import { describe, expect, it } from 'vitest';
import { normalizeOrigin, originAllowed, parseOriginList } from '@/modules/widget/origin';

describe('widget origin helpers', () => {
  it('normalizes exact http(s) origins and rejects credentials or paths', () => {
    expect(normalizeOrigin('https://www.example.com')).toBe('https://www.example.com');
    expect(normalizeOrigin('http://127.0.0.1:3100/')).toBe('http://127.0.0.1:3100');
    expect(normalizeOrigin('https://user:pass@example.com')).toBeNull();
    expect(normalizeOrigin('https://example.com/path')).toBeNull();
    expect(normalizeOrigin('ftp://example.com')).toBeNull();
  });

  it('parses unique origin lists and matches allow checks', () => {
    expect(parseOriginList('https://a.example\nhttps://b.example,https://a.example')).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
    expect(originAllowed(['https://a.example'], 'https://a.example')).toBe(true);
    expect(originAllowed(['https://a.example'], 'https://evil.example')).toBe(false);
    expect(originAllowed(['https://a.example'], null)).toBe(false);
  });
});
