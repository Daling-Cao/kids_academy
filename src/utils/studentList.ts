import type { User } from '../types';

export type StudentGroupFilter = 'all' | 'none' | number;
export type StudentSortOrder = 'default' | 'coins-desc' | 'coins-asc';

/**
 * Safely normalizes a student's coin balance to a non-negative integer.
 * Handles undefined, null, NaN, Infinity, negative numbers, floats, numeric strings,
 * and unexpected runtime types by falling back to 0 or truncating finite positives.
 */
export function getStudentCoins(student: Pick<User, 'coins'> | null | undefined): number {
    if (!student || typeof student !== 'object') {
        return 0;
    }

    const raw: unknown = student.coins;

    if (typeof raw === 'number') {
        if (!Number.isFinite(raw)) return 0;
        const truncated = Math.trunc(raw);
        return truncated > 0 ? truncated : 0;
    }

    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed === '') return 0;
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed)) return 0;
        const truncated = Math.trunc(parsed);
        return truncated > 0 ? truncated : 0;
    }

    return 0;
}

/**
 * Returns a non-empty display name for a student.
 * Prefers trimmed `name`, then trimmed `username`, and falls back to `'?'`
 * so avatar initial extraction (`[0].toUpperCase()`) never throws.
 */
export function getStudentDisplayName(
    student: Partial<Pick<User, 'name' | 'username'>> | null | undefined,
): string {
    if (!student || typeof student !== 'object') {
        return '?';
    }

    const trimmedName = typeof student.name === 'string' ? student.name.trim() : '';
    if (trimmedName.length > 0) {
        return trimmedName;
    }

    const trimmedUsername = typeof student.username === 'string' ? student.username.trim() : '';
    if (trimmedUsername.length > 0) {
        return trimmedUsername;
    }

    return '?';
}

function compareStudentsTieBreaker(a: User, b: User): number {
    const nameDiff = getStudentDisplayName(a).localeCompare(
        getStudentDisplayName(b),
        'de',
        { sensitivity: 'base' },
    );
    if (nameDiff !== 0) {
        return nameDiff;
    }

    const idA = typeof a.id === 'number' && Number.isFinite(a.id) ? a.id : 0;
    const idB = typeof b.id === 'number' && Number.isFinite(b.id) ? b.id : 0;
    return idA - idB;
}

/**
 * Filters students by group and sorts them according to `sortOrder`.
 * Returns a new array copy and never mutates the input `students` array.
 */
export function filterAndSortStudents(
    students: readonly User[],
    groupFilter: StudentGroupFilter,
    sortOrder: StudentSortOrder,
): User[] {
    if (!Array.isArray(students)) {
        return [];
    }

    const filtered = students.filter(student => {
        if (groupFilter === 'all') return true;
        if (groupFilter === 'none') return !student.groupId;
        return student.groupId === groupFilter;
    });

    if (sortOrder === 'default') {
        return filtered;
    }

    return [...filtered].sort((a, b) => {
        const coinDiff =
            sortOrder === 'coins-desc'
                ? getStudentCoins(b) - getStudentCoins(a)
                : getStudentCoins(a) - getStudentCoins(b);

        if (coinDiff !== 0) {
            return coinDiff;
        }

        return compareStudentsTieBreaker(a, b);
    });
}

/**
 * Applies an authoritative coin balance returned by the server to both the
 * student list and the currently selected student without mutating inputs.
 */
export function applyStudentCoinsUpdate(
    students: readonly User[],
    selectedStudent: User | null,
    studentId: number,
    serverCoins: unknown,
): { students: User[]; selectedStudent: User | null } {
    const normalizedCoins = getStudentCoins({ coins: serverCoins as number });
    const nextStudents = Array.isArray(students)
        ? students.map(s => (s.id === studentId ? { ...s, coins: normalizedCoins } : s))
        : [];
    const nextSelected =
        selectedStudent && selectedStudent.id === studentId
            ? { ...selectedStudent, coins: normalizedCoins }
            : selectedStudent;

    return {
        students: nextStudents,
        selectedStudent: nextSelected,
    };
}
