import { register } from 'node:module';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { StudentGroup, User } from '../types';
import {
    applyStudentCoinsUpdate,
    filterAndSortStudents,
    getStudentCoins,
    getStudentDisplayName,
} from './studentList';

// Stub `../App` in the Node test environment so importing `StudentsTab` does not
// pull in browser-only router/Quill CSS bundles while rendering real JSX markup.
register(
    'data:text/javascript,' +
        encodeURIComponent(`
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '../App' || specifier === '../App.tsx') {
    return {
      shortCircuit: true,
      url: 'data:text/javascript,export async function authFetch() { return new Response("[]"); }',
    };
  }
  return nextResolve(specifier, context);
}
`),
    import.meta.url,
);

const { default: StudentsTab } = await import('../pages/StudentsTab');

function makeStudent(overrides: Partial<User> & { id: number; username: string }): User {
    return {
        role: 'student',
        ...overrides,
    };
}

describe('getStudentCoins', () => {
    it('returns non-negative integer coins for valid finite numbers', () => {
        assert.equal(getStudentCoins({ coins: 0 }), 0);
        assert.equal(getStudentCoins({ coins: 15 }), 15);
        assert.equal(getStudentCoins({ coins: 42.9 }), 42);
        assert.equal(getStudentCoins({ coins: 0.7 }), 0);
    });

    it('safely normalizes undefined, null, NaN, Infinity, and negative numbers to 0', () => {
        assert.equal(getStudentCoins(undefined), 0);
        assert.equal(getStudentCoins(null), 0);
        assert.equal(getStudentCoins({}), 0);
        assert.equal(getStudentCoins({ coins: undefined }), 0);
        assert.equal(getStudentCoins({ coins: null as unknown as number }), 0);
        assert.equal(getStudentCoins({ coins: Number.NaN }), 0);
        assert.equal(getStudentCoins({ coins: Number.POSITIVE_INFINITY }), 0);
        assert.equal(getStudentCoins({ coins: Number.NEGATIVE_INFINITY }), 0);
        assert.equal(getStudentCoins({ coins: -1 }), 0);
        assert.equal(getStudentCoins({ coins: -99.8 }), 0);
        assert.ok(Object.is(getStudentCoins({ coins: -0 }), 0));
        assert.ok(Object.is(getStudentCoins({ coins: -0.4 }), 0));
    });

    it('handles numeric strings and rejects malicious or invalid runtime types', () => {
        assert.equal(getStudentCoins({ coins: '28' as unknown as number }), 28);
        assert.equal(getStudentCoins({ coins: ' 13.6 ' as unknown as number }), 13);
        assert.equal(getStudentCoins({ coins: '-7' as unknown as number }), 0);
        assert.equal(getStudentCoins({ coins: '' as unknown as number }), 0);
        assert.equal(getStudentCoins({ coins: '   ' as unknown as number }), 0);
        assert.equal(getStudentCoins({ coins: '"><script>alert(1)</script>' as unknown as number }), 0);
        assert.equal(getStudentCoins({ coins: 'Infinity' as unknown as number }), 0);
        assert.equal(getStudentCoins({ coins: { valueOf: () => 999 } as unknown as number }), 0);
        assert.equal(getStudentCoins({ coins: [100] as unknown as number }), 0);
    });
});

describe('getStudentDisplayName', () => {
    it('prefers trimmed name, falls back to trimmed username, and guards empty strings with "?"', () => {
        assert.equal(getStudentDisplayName({ name: '  Lukas  ', username: 'lukas01' }), 'Lukas');
        assert.equal(getStudentDisplayName({ name: '   ', username: '  mia_k  ' }), 'mia_k');
        assert.equal(getStudentDisplayName({ name: undefined, username: 'noah' }), 'noah');
        assert.equal(getStudentDisplayName({ name: '', username: '' }), '?');
        assert.equal(getStudentDisplayName({ name: '   ', username: '   ' }), '?');
        assert.equal(getStudentDisplayName(null), '?');
        assert.equal(getStudentDisplayName(undefined), '?');
    });
});

describe('filterAndSortStudents', () => {
    const sampleStudents: readonly User[] = [
        makeStudent({ id: 3, username: 'clara', name: 'Clara', coins: 12, groupId: 10 }),
        makeStudent({ id: 1, username: 'ben', name: 'Ben', coins: 30, groupId: 10 }),
        makeStudent({ id: 4, username: 'david', name: 'David', coins: 5, groupId: null }),
        makeStudent({ id: 2, username: 'anna', name: 'Anna', coins: 30, groupId: 20 }),
        makeStudent({ id: 5, username: 'eva', coins: undefined, groupId: undefined }),
    ];

    it('preserves original order in default sort mode', () => {
        const result = filterAndSortStudents(sampleStudents, 'all', 'default');
        assert.deepEqual(
            result.map(s => s.id),
            [3, 1, 4, 2, 5],
        );
    });

    it('sorts students by coins descending in coins-desc mode', () => {
        const result = filterAndSortStudents(sampleStudents, 'all', 'coins-desc');
        assert.deepEqual(
            result.map(s => ({ id: s.id, coins: getStudentCoins(s) })),
            [
                { id: 2, coins: 30 }, // Anna (30) before Ben (30) via tie-breaker
                { id: 1, coins: 30 },
                { id: 3, coins: 12 },
                { id: 4, coins: 5 },
                { id: 5, coins: 0 },
            ],
        );
    });

    it('sorts students by coins ascending in coins-asc mode', () => {
        const result = filterAndSortStudents(sampleStudents, 'all', 'coins-asc');
        assert.deepEqual(
            result.map(s => ({ id: s.id, coins: getStudentCoins(s) })),
            [
                { id: 5, coins: 0 },
                { id: 4, coins: 5 },
                { id: 3, coins: 12 },
                { id: 2, coins: 30 }, // Anna before Ben on equal coins
                { id: 1, coins: 30 },
            ],
        );
    });

    it('combines groupFilter (all, specific groupId, none) with all sort modes accurately', () => {
        // Group 10: Clara (12), Ben (30)
        assert.deepEqual(
            filterAndSortStudents(sampleStudents, 10, 'default').map(s => s.id),
            [3, 1],
        );
        assert.deepEqual(
            filterAndSortStudents(sampleStudents, 10, 'coins-desc').map(s => s.id),
            [1, 3],
        );
        assert.deepEqual(
            filterAndSortStudents(sampleStudents, 10, 'coins-asc').map(s => s.id),
            [3, 1],
        );

        // No group ('none'): David (5, groupId: null), Eva (0, groupId: undefined)
        assert.deepEqual(
            filterAndSortStudents(sampleStudents, 'none', 'default').map(s => s.id),
            [4, 5],
        );
        assert.deepEqual(
            filterAndSortStudents(sampleStudents, 'none', 'coins-desc').map(s => s.id),
            [4, 5],
        );
        assert.deepEqual(
            filterAndSortStudents(sampleStudents, 'none', 'coins-asc').map(s => s.id),
            [5, 4],
        );

        // Non-existent group -> empty result
        assert.deepEqual(filterAndSortStudents(sampleStudents, 999, 'coins-desc'), []);
    });

    it('applies deterministic German case-insensitive name + id tie-breaker for equal scores', () => {
        const tied: User[] = [
            makeStudent({ id: 9, username: 'zoe', name: 'Zoe', coins: 20 }),
            makeStudent({ id: 7, username: 'alex2', name: 'alex', coins: 20 }),
            makeStudent({ id: 2, username: 'alex1', name: 'Alex', coins: 20 }),
            makeStudent({ id: 5, username: 'aenne', name: 'Änne', coins: 20 }),
            makeStudent({ id: 4, username: 'berta', name: 'Berta', coins: 20 }),
        ];

        const descIds = filterAndSortStudents(tied, 'all', 'coins-desc').map(s => s.id);
        const ascIds = filterAndSortStudents(tied, 'all', 'coins-asc').map(s => s.id);

        // Alex (id 2) -> alex (id 7) -> Änne (id 5) -> Berta (id 4) -> Zoe (id 9)
        assert.deepEqual(descIds, [2, 7, 5, 4, 9]);
        assert.deepEqual(ascIds, [2, 7, 5, 4, 9]);
    });

    it('handles empty arrays, single-element arrays, and never mutates the input array', () => {
        assert.deepEqual(filterAndSortStudents([], 'all', 'coins-desc'), []);

        const single = Object.freeze([makeStudent({ id: 1, username: 'solo', coins: 7 })]);
        const singleRes = filterAndSortStudents(single, 'all', 'coins-asc');
        assert.deepEqual(singleRes.map(s => s.id), [1]);
        assert.notStrictEqual(singleRes, single);

        const frozenInput = Object.freeze([
            makeStudent({ id: 10, username: 'u10', name: 'Max', coins: 5 }),
            makeStudent({ id: 11, username: 'u11', name: 'Anna', coins: 50 }),
            makeStudent({ id: 12, username: 'u12', name: 'Leo', coins: 15 }),
        ]);
        const snapshotBefore = frozenInput.map(s => ({ ...s }));

        const sortedDesc = filterAndSortStudents(frozenInput, 'all', 'coins-desc');
        const sortedDefault = filterAndSortStudents(frozenInput, 'all', 'default');

        assert.notStrictEqual(sortedDesc, frozenInput);
        assert.notStrictEqual(sortedDefault, frozenInput);
        assert.deepEqual(frozenInput, snapshotBefore);
        assert.deepEqual(
            sortedDesc.map(s => s.id),
            [11, 12, 10],
        );
    });
});

describe('applyStudentCoinsUpdate (manual coin adjustment sync)', () => {
    it('uses authoritative server coins without double-adding and keeps list & sort in sync', () => {
        const initial: User[] = [
            makeStudent({ id: 1, username: 'lena', name: 'Lena', coins: 10 }),
            makeStudent({ id: 2, username: 'tim', name: 'Tim', coins: 20 }),
        ];
        const selected = initial[0];

        // Teacher adjusts Lena by +15 -> server returns authoritative coins: 25
        const { students: updatedList, selectedStudent: updatedSelected } = applyStudentCoinsUpdate(
            initial,
            selected,
            1,
            25,
        );

        assert.equal(updatedSelected?.coins, 25);
        assert.equal(updatedList.find(s => s.id === 1)?.coins, 25);
        // Input immutability preserved
        assert.equal(initial[0].coins, 10);
        assert.equal(selected.coins, 10);

        // Re-sorting immediately moves Lena (25) ahead of Tim (20)
        const resorted = filterAndSortStudents(updatedList, 'all', 'coins-desc');
        assert.deepEqual(
            resorted.map(s => s.id),
            [1, 2],
        );
    });
});

describe('StudentsTab static rendering & XSS security', () => {
    it('renders sort pills, student coin badges next to names in sorted order, and handles blank names safely', () => {
        const students: User[] = [
            makeStudent({ id: 1, username: 'low_user', name: 'Low Scorer', coins: 3, groupId: 1 }),
            makeStudent({ id: 2, username: 'high_user', name: 'High Scorer', coins: 99, groupId: 1 }),
            makeStudent({ id: 3, username: '   ', name: '   ', coins: undefined }),
        ];
        const groups: StudentGroup[] = [{ id: 1, name: 'Klasse 4a', memberCount: 2 }];

        const html = renderToStaticMarkup(
            React.createElement(StudentsTab, {
                initialStudents: students,
                initialGroups: groups,
                initialSortOrder: 'coins-desc',
                initialSelectedStudent: students[1],
            }),
        );

        // Sort controls are rendered with proper labels and aria-pressed state
        assert.ok(html.includes('Sortieren:'));
        assert.ok(html.includes('Standard'));
        assert.ok(html.includes('🪙 Punkte ↓'));
        assert.ok(html.includes('🪙 Punkte ↑'));
        assert.ok(html.includes('aria-pressed="true"'));

        // Coin badges rendered next to each student with accessible title
        assert.ok(html.includes('🪙 99'));
        assert.ok(html.includes('title="99 BlockCoins"'));
        assert.ok(html.includes('🪙 3'));
        assert.ok(html.includes('title="3 BlockCoins"'));
        assert.ok(html.includes('🪙 0'));
        assert.ok(html.includes('title="0 BlockCoins"'));

        // Order check in rendered markup: High Scorer (99) appears before Low Scorer (3), which appears before '?' (0)
        const highIdx = html.indexOf('High Scorer');
        const lowIdx = html.indexOf('Low Scorer');
        assert.ok(highIdx > -1 && lowIdx > -1 && highIdx < lowIdx);
    });

    it('renders sort controls even when no student groups exist', () => {
        const html = renderToStaticMarkup(
            React.createElement(StudentsTab, {
                initialStudents: [],
                initialGroups: [],
            }),
        );

        assert.ok(html.includes('Sortieren:'));
        assert.ok(html.includes('Standard'));
        assert.ok(html.includes('🪙 Punkte ↓'));
        assert.ok(html.includes('🪙 Punkte ↑'));
        assert.ok(html.includes('Noch keine Schüler.'));
    });

    it('strictly escapes malicious HTML/XSS payloads in student names, usernames, groups, and malformed coins', () => {
        const maliciousStudents: User[] = [
            makeStudent({
                id: 1,
                username: '"><script>alert("u")</script>',
                name: '<img src=x onerror=alert(1)>',
                coins: '"><svg onload=alert(2)>' as unknown as number,
                groupId: 7,
            }),
        ];
        const maliciousGroups: StudentGroup[] = [
            { id: 7, name: '<script>alert("group")</script>', memberCount: 1 },
        ];

        const html = renderToStaticMarkup(
            React.createElement(StudentsTab, {
                initialStudents: maliciousStudents,
                initialGroups: maliciousGroups,
                initialSelectedStudent: maliciousStudents[0],
            }),
        );

        // No unescaped executable tags may appear anywhere in rendered HTML
        assert.equal(html.includes('<img src=x'), false);
        assert.equal(html.includes('<script>'), false);
        assert.equal(html.includes('<svg onload='), false);

        // Payloads are safely HTML-encoded as text and malformed coins fall back to 0
        assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
        assert.ok(html.includes('&lt;script&gt;alert(&quot;group&quot;)&lt;/script&gt;'));
        assert.ok(html.includes('🪙 0'));
        assert.ok(html.includes('title="0 BlockCoins"'));
    });
});
