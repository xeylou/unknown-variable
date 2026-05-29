import { describe, it, expect } from 'vitest';
import { helpCategories, effectiveTier, type HelpCategory } from '../src/data/help';

describe('help.effectiveTier', () => {
  it('utilise le tier explicite de la commande si fourni', () => {
    const cat: HelpCategory = {
      id: 'x', emoji: '', label: 'x', summary: '',
      defaultTier: 'admin',
      commands: [{ usage: '/foo', description: '', tier: 'staff' }]
    };
    expect(effectiveTier(cat.commands[0], cat)).toBe('staff');
  });

  it('retombe sur defaultTier de la catégorie sinon', () => {
    const cat: HelpCategory = {
      id: 'x', emoji: '', label: 'x', summary: '',
      defaultTier: 'admin',
      commands: [{ usage: '/foo', description: '' }]
    };
    expect(effectiveTier(cat.commands[0], cat)).toBe('admin');
  });

  it('retombe sur « public » si ni l\'un ni l\'autre', () => {
    const cat: HelpCategory = {
      id: 'x', emoji: '', label: 'x', summary: '',
      commands: [{ usage: '/foo', description: '' }]
    };
    expect(effectiveTier(cat.commands[0], cat)).toBe('public');
  });
});

describe('help.helpCategories', () => {
  it('catégorie modération entièrement staff/admin', () => {
    const cat = helpCategories.find((c) => c.id === 'moderation')!;
    expect(cat.defaultTier).toBe('staff');
    // toute commande doit produire un tier ∈ {staff, admin}
    for (const cmd of cat.commands) {
      expect(['staff', 'admin']).toContain(effectiveTier(cmd, cat));
    }
  });

  it('catégorie admin verrouillée à admin', () => {
    const cat = helpCategories.find((c) => c.id === 'admin')!;
    for (const cmd of cat.commands) {
      expect(effectiveTier(cmd, cat)).toBe('admin');
    }
  });

  it('catégorie tickets : /setup-tickets est admin, /add-user est ticket-staff, /ticket-stats reste staff', () => {
    const cat = helpCategories.find((c) => c.id === 'tickets')!;
    const setup = cat.commands.find((c) => c.usage.startsWith('/setup-tickets'))!;
    const addUser = cat.commands.find((c) => c.usage.startsWith('/add-user'))!;
    const stats = cat.commands.find((c) => c.usage.startsWith('/ticket-stats'))!;
    expect(effectiveTier(setup, cat)).toBe('admin');
    expect(effectiveTier(addUser, cat)).toBe('ticket-staff');
    expect(effectiveTier(stats, cat)).toBe('staff');
  });

  it('catégorie utility : defaultTier=staff, /rappel-role est admin', () => {
    const cat = helpCategories.find((c) => c.id === 'utility')!;
    expect(cat.defaultTier).toBe('staff');
    const ping = cat.commands.find((c) => c.usage.startsWith('/ping'))!;
    const rappelRole = cat.commands.find((c) => c.usage.startsWith('/rappel-role'))!;
    expect(effectiveTier(ping, cat)).toBe('staff');
    expect(effectiveTier(rappelRole, cat)).toBe('admin');
  });

  it('catégorie integrations : /mcstatus et /mclink sont staff, le reste admin', () => {
    const cat = helpCategories.find((c) => c.id === 'integrations')!;
    expect(cat.defaultTier).toBe('admin');
    const mcstatus = cat.commands.find((c) => c.usage.startsWith('/mcstatus'))!;
    const mclink = cat.commands.find((c) => c.usage.startsWith('/mclink'))!;
    const mcwl = cat.commands.find((c) => c.usage.startsWith('/mcwhitelist'))!;
    expect(effectiveTier(mcstatus, cat)).toBe('staff');
    expect(effectiveTier(mclink, cat)).toBe('staff');
    expect(effectiveTier(mcwl, cat)).toBe('admin');
  });
});
