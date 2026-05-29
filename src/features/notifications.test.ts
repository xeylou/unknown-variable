import { describe, it, expect, vi } from 'vitest';

// Le module importe `database` (Prisma) et `config` au top-level — on les mocke
// pour ne pas boot la vraie base ni exiger un .env.
vi.mock('../database', () => ({ prisma: {} }));
vi.mock('../utils/mentions', () => ({ noMentions: { parse: [] } }));
vi.mock('../config', () => ({
  default: { twitch: { clientId: null, clientSecret: null } }
}));

import { parseFirstFeedItem } from './notifications';

describe('parseFirstFeedItem', () => {
  it('parses an RSS 2.0 feed (item with guid + link + title)', () => {
    const xml = `<?xml version="1.0"?>
<rss><channel>
  <item>
    <title>Hello world</title>
    <link>https://example.com/post-1</link>
    <guid>abc-123</guid>
    <pubDate>Mon, 25 May 2026 10:00:00 GMT</pubDate>
  </item>
  <item>
    <title>Older</title>
    <link>https://example.com/post-0</link>
    <guid>abc-000</guid>
  </item>
</channel></rss>`;
    const item = parseFirstFeedItem(xml);
    expect(item).not.toBeNull();
    expect(item!.id).toBe('abc-123');
    expect(item!.title).toBe('Hello world');
    expect(item!.link).toBe('https://example.com/post-1');
  });

  it('parses an Atom feed (entry with id + link href + title)', () => {
    const xml = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>tag:example.com,2026:post-42</id>
    <title>Atom title</title>
    <link rel="alternate" type="text/html" href="https://example.com/atom-42"/>
    <updated>2026-05-25T10:00:00Z</updated>
  </entry>
</feed>`;
    const item = parseFirstFeedItem(xml);
    expect(item).not.toBeNull();
    expect(item!.id).toBe('tag:example.com,2026:post-42');
    expect(item!.title).toBe('Atom title');
    expect(item!.link).toBe('https://example.com/atom-42');
  });

  it('handles CDATA in titles (Instagram via RSSHub uses this)', () => {
    const xml = `<rss><channel><item>
      <title><![CDATA[Caption with <emoji> and "quotes"]]></title>
      <link>https://example.com/insta-1</link>
      <guid>insta-1</guid>
    </item></channel></rss>`;
    const item = parseFirstFeedItem(xml);
    expect(item!.title).toBe('Caption with <emoji> and "quotes"');
  });

  it('falls back to <link> when <guid> and <id> are missing', () => {
    const xml = `<rss><channel><item>
      <title>No id</title>
      <link>https://example.com/only-link</link>
    </item></channel></rss>`;
    const item = parseFirstFeedItem(xml);
    expect(item!.id).toBe('https://example.com/only-link');
  });

  it('returns null on empty or malformed feed', () => {
    expect(parseFirstFeedItem('')).toBeNull();
    expect(parseFirstFeedItem('<rss></rss>')).toBeNull();
    expect(parseFirstFeedItem('<rss><channel></channel></rss>')).toBeNull();
  });

  it('handles namespaced YouTube-style Atom entries', () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015">
      <entry>
        <id>yt:video:dQw4w9WgXcQ</id>
        <yt:videoId>dQw4w9WgXcQ</yt:videoId>
        <title>Never Gonna</title>
        <link rel="alternate" href="https://youtube.com/watch?v=dQw4w9WgXcQ"/>
      </entry>
    </feed>`;
    const item = parseFirstFeedItem(xml);
    expect(item!.id).toBe('yt:video:dQw4w9WgXcQ');
    expect(item!.title).toBe('Never Gonna');
  });

  it('ignores attributes when matching tags', () => {
    const xml = `<rss><channel><item xml:base="https://example.com">
      <title type="text">Tagged</title>
      <link>https://example.com/x</link>
      <guid isPermaLink="false">x-1</guid>
    </item></channel></rss>`;
    const item = parseFirstFeedItem(xml);
    expect(item!.id).toBe('x-1');
    expect(item!.title).toBe('Tagged');
    expect(item!.link).toBe('https://example.com/x');
  });

  it('returns the first item only (not later ones)', () => {
    const xml = `<rss><channel>
      <item><title>First</title><guid>1</guid><link>https://a/1</link></item>
      <item><title>Second</title><guid>2</guid><link>https://a/2</link></item>
    </channel></rss>`;
    const item = parseFirstFeedItem(xml);
    expect(item!.id).toBe('1');
    expect(item!.title).toBe('First');
  });
});
