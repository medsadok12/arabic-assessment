import { describe, expect, it, vi } from 'vitest';
import { resolveActiveIdentity } from './active-child';
import { duelParticipant } from './letter-catcher-duel-server';

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => undefined }) }));

const parent = () => ({ id: 'guardian', email: 'guardian@example.test', app_metadata: { custom_avatar_url: '/photos/guardian.png' }, user_metadata: { full_name: 'اسم الوالد', avatar_url: 'https://google.example.test/guardian.png' } });
const childIdentity = { effectiveUserId: 'child-a', viewingChild: { id: 'child-a', full_name: 'سارة محمد' } };
function familyAdmin({ childUser = null, ownerId = 'guardian' } = {}) {
  const filters = [];
  const row = { id: 'child-a', parent_user_id: ownerId, full_name: 'سارة محمد' };
  const query = {
    select: () => query,
    eq: (key, value) => { filters.push([key, value]); return query; },
    maybeSingle: async () => ({ data: filters.every(([key, value]) => row[key] === value) ? row : null }),
  };
  const getUserById = vi.fn(async () => ({ data: { user: childUser } }));
  return { from: () => query, auth: { admin: { getUserById } }, filters };
}

describe('Duel profile photo identity', () => {
  it('keeps the custom profile over Google and preserves the fresh upload cache-buster for the same photo', async () => {
    const user = parent();
    const admin = familyAdmin();
    const identity = { effectiveUserId: user.id, viewingChild: null };
    expect((await duelParticipant(user, identity, admin)).avatar_url).toBe('/photos/guardian.png');
    user.user_metadata.avatar_url = '/photos/guardian.png?t=latest-upload';
    expect((await duelParticipant(user, identity, admin)).avatar_url).toBe('/photos/guardian.png?t=latest-upload');
    user.app_metadata.custom_avatar_url = null;
    user.user_metadata.avatar_url = 'https://media.example.test/own-upload.png?t=2';
    expect((await duelParticipant(user, identity, admin)).avatar_url).toBe(user.user_metadata.avatar_url);
    expect(admin.auth.admin.getUserById).not.toHaveBeenCalled();
  });

  it('uses only the exact owned child Auth profile after active-child ownership verification', async () => {
    const admin = familyAdmin({ childUser: { id: 'child-a', email: 'child@example.test', app_metadata: { custom_avatar_url: '/photos/sara.png' }, user_metadata: { avatar_url: '/photos/sara.png?t=3', secret: 'not public' } } });
    const user = parent();
    const identity = await resolveActiveIdentity(user, admin, new Request('https://www.aarem.net/api/games/letter-catcher/duel?profile=1&child=child-a'));
    const player = await duelParticipant(user, identity, admin);
    expect(admin.filters).toContainEqual(['id', 'child-a']);
    expect(admin.filters).toContainEqual(['parent_user_id', user.id]);
    expect(admin.auth.admin.getUserById.mock.calls).toEqual([['child-a'], ['child-a']]);
    expect(player).toEqual({ id: 'child-a', name: 'سارة', avatar_url: '/photos/sara.png?t=3' });
  });

  it('does not load another family child photo when the child selection is forged', async () => {
    const admin = familyAdmin({ ownerId: 'other-guardian', childUser: { id: 'child-a', email: 'child@example.test', app_metadata: { custom_avatar_url: '/private/other-child.png' } } });
    const user = parent();
    const identity = await resolveActiveIdentity(user, admin, new Request('https://www.aarem.net/api/games/letter-catcher/duel?profile=1&child=child-a'));
    expect(await duelParticipant(user, identity, admin)).toEqual({ id: user.id, name: 'اسم', avatar_url: '/photos/guardian.png' });
    expect(admin.auth.admin.getUserById).not.toHaveBeenCalled();
  });

  it('leaves children without their own photo neutral, including Auth lookup failures or mismatched users', async () => {
    for (const childUser of [null, { id: 'child-a' }, { id: 'sibling', app_metadata: { custom_avatar_url: '/photos/sibling.png' } }]) {
      expect((await duelParticipant(parent(), childIdentity, familyAdmin({ childUser }))).avatar_url).toBeNull();
    }
    const admin = familyAdmin();
    admin.auth.admin.getUserById.mockRejectedValue(new Error('unavailable'));
    expect((await duelParticipant(parent(), childIdentity, admin)).avatar_url).toBeNull();
  });

  it.each([
    '//elsewhere.example.test/photo.png', '/\\elsewhere.example.test/photo.png', 'https://media.example.test\\photo.png',
    'javascript:alert(1)', 'data:image/png;base64,AAAA', 'http://media.example.test/photo.png',
    'https://user:secret@media.example.test/photo.png', '/photo.png\n?hidden=1',
  ])('rejects unsafe stored photo URLs: %s', async url => {
    const user = parent(); user.app_metadata.custom_avatar_url = url; user.user_metadata.avatar_url = url;
    expect((await duelParticipant(user, { effectiveUserId: user.id }, familyAdmin())).avatar_url).toBeNull();
  });
});
