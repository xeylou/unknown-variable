import { describe, it, expect } from 'vitest';
import { applyPlaceholders } from '../src/utils/placeholders';

describe('Placeholders Utils', () => {
  it('should replace all placeholders correctly', () => {
    const mockMember = {
      toString: () => '<@12345>',
      user: { username: 'TestUser' },
      guild: { name: 'TestServer', memberCount: 42 }
    };

    const text = 'Welcome {user}! Hello {username}, welcome to {server}. You are the {count}th member.';
    const result = applyPlaceholders(text, mockMember);

    expect(result).toBe('Welcome <@12345>! Hello TestUser, welcome to TestServer. You are the 42th member.');
  });

  it('should handle missing placeholders without altering text', () => {
    const mockMember = {
      toString: () => '<@123>',
      user: { username: 'User' },
      guild: { name: 'Server', memberCount: 10 }
    };

    const text = 'Hello world!';
    expect(applyPlaceholders(text, mockMember)).toBe('Hello world!');
  });
});
