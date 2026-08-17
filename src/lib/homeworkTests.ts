// Server-side homework test runner.
//
// A handed-in file is analysed statically — nothing from the student is ever
// executed. Scratch archives (.sb3) are unzipped in memory and their
// project.json is inspected; everything else is treated as source text.

import fs from 'fs';
import AdmZip from 'adm-zip';
import type { HomeworkCheck, HomeworkCheckResult } from '../types';
import { describeCheck, normalizeChecks, plural } from './homeworkChecks';

export const HOMEWORK_ALLOWED_EXTENSIONS = [
    '.sb3', '.sb2', '.sb',
    '.py', '.ino', '.js', '.ts', '.c', '.cpp', '.h', '.java', '.cs', '.lua',
    '.html', '.css', '.json', '.txt', '.md',
];

export const HOMEWORK_MAX_FILE_BYTES = 25 * 1024 * 1024;

// The upload limit only bounds the *compressed* archive. project.json is
// inflated into memory, so a small archive with a huge declared entry (or a
// wildly improbable compression ratio) would let one hand-in exhaust the
// single Node process. Real Scratch projects stay far below these numbers —
// the JSON holds no media, only block structure.
const MAX_PROJECT_JSON_BYTES = 32 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 200;

// Text files are read whole as well, so they get the same treatment.
const MAX_TEXT_BYTES = 5 * 1024 * 1024;

interface ScratchStats {
    spriteCount: number;
    blockCount: number;
    scriptCount: number;
    costumeCount: number;
    soundCount: number;
    opcodeCounts: Record<string, number>;
    variableNames: string[];
    listNames: string[];
    extensions: string[];
}

export interface HomeworkAnalysis {
    kind: 'scratch' | 'text';
    /** Set when the file could not be read at all — every check then fails. */
    error?: string;
    scratch?: ScratchStats;
    /** Raw source for text files, project.json for .sb3. */
    text: string;
}

function extensionOf(fileName: string): string {
    const dot = fileName.lastIndexOf('.');
    return dot === -1 ? '' : fileName.slice(dot).toLowerCase();
}

export function isAllowedHomeworkFile(fileName: string): boolean {
    return HOMEWORK_ALLOWED_EXTENSIONS.includes(extensionOf(fileName));
}

function collectScratchStats(projectJson: any): ScratchStats {
    const stats: ScratchStats = {
        spriteCount: 0,
        blockCount: 0,
        scriptCount: 0,
        costumeCount: 0,
        soundCount: 0,
        opcodeCounts: {},
        variableNames: [],
        listNames: [],
        extensions: Array.isArray(projectJson?.extensions) ? projectJson.extensions.map(String) : [],
    };

    const targets = Array.isArray(projectJson?.targets) ? projectJson.targets : [];
    for (const target of targets) {
        if (!target || typeof target !== 'object') continue;
        if (!target.isStage) stats.spriteCount++;

        stats.costumeCount += Array.isArray(target.costumes) ? target.costumes.length : 0;
        stats.soundCount += Array.isArray(target.sounds) ? target.sounds.length : 0;

        // Variables/lists are stored as { id: [name, value] }.
        for (const entry of Object.values(target.variables || {})) {
            if (Array.isArray(entry) && entry[0]) stats.variableNames.push(String(entry[0]));
        }
        for (const entry of Object.values(target.lists || {})) {
            if (Array.isArray(entry) && entry[0]) stats.listNames.push(String(entry[0]));
        }

        // Loose reporter blocks are stored as arrays instead of objects; only
        // real blocks carry an opcode. Shadow blocks are the number/dropdown
        // fields sitting inside other blocks — a child never dragged those in,
        // so they are not counted as blocks either.
        for (const block of Object.values(target.blocks || {})) {
            if (!block || typeof block !== 'object' || Array.isArray(block)) continue;
            const opcode = (block as any).opcode;
            if (typeof opcode !== 'string') continue;
            if ((block as any).shadow) continue;
            stats.blockCount++;
            stats.opcodeCounts[opcode] = (stats.opcodeCounts[opcode] || 0) + 1;
            // A script is a stack that starts on the canvas.
            if ((block as any).topLevel) stats.scriptCount++;
        }
    }

    return stats;
}

export function analyzeHomeworkFile(filePath: string, fileName: string): HomeworkAnalysis {
    const ext = extensionOf(fileName);

    if (ext === '.sb3' || ext === '.sb2' || ext === '.sb') {
        try {
            const zip = new AdmZip(filePath);
            const entry = zip.getEntry('project.json');
            if (!entry) {
                return { kind: 'scratch', text: '', error: 'Die Datei enthält kein Scratch-Projekt (project.json fehlt).' };
            }

            // Refuse the entry before inflating it: check the size the archive
            // declares and how hard it claims to compress.
            const declaredSize = entry.header.size;
            const compressedSize = entry.header.compressedSize;
            const ratio = compressedSize > 0 ? declaredSize / compressedSize : 0;
            if (declaredSize > MAX_PROJECT_JSON_BYTES || ratio > MAX_COMPRESSION_RATIO) {
                return {
                    kind: 'scratch',
                    text: '',
                    error: 'Die Scratch-Datei ist zu groß oder beschädigt und kann nicht geprüft werden.',
                };
            }

            const data = entry.getData();
            // The header is only a claim; the inflated buffer is the truth.
            if (data.length > MAX_PROJECT_JSON_BYTES) {
                return {
                    kind: 'scratch',
                    text: '',
                    error: 'Die Scratch-Datei ist zu groß oder beschädigt und kann nicht geprüft werden.',
                };
            }
            const raw = data.toString('utf8');
            const projectJson = JSON.parse(raw);
            if (!Array.isArray(projectJson?.targets)) {
                return {
                    kind: 'scratch',
                    text: raw,
                    error: 'Das Projekt ist in einem alten Format gespeichert. Bitte in Scratch 3 öffnen und als .sb3 speichern.',
                };
            }
            return { kind: 'scratch', text: raw, scratch: collectScratchStats(projectJson) };
        } catch {
            return { kind: 'scratch', text: '', error: 'Die Scratch-Datei konnte nicht gelesen werden. Ist sie vollständig hochgeladen?' };
        }
    }

    try {
        if (fs.statSync(filePath).size > MAX_TEXT_BYTES) {
            return { kind: 'text', text: '', error: 'Die Datei ist zu groß, um geprüft zu werden.' };
        }
        const text = fs.readFileSync(filePath, 'utf8');
        return { kind: 'text', text };
    } catch {
        return { kind: 'text', text: '', error: 'Die Datei konnte nicht gelesen werden.' };
    }
}

function numericValue(check: HomeworkCheck): number {
    const n = Number(check.value);
    return Number.isFinite(n) ? Math.floor(n) : 0;
}

function countOpcode(stats: ScratchStats, needle: string): number {
    const wanted = needle.toLowerCase();
    let total = 0;
    for (const [opcode, count] of Object.entries(stats.opcodeCounts)) {
        // Exact opcode, or a family prefix like "pen_" / "control_".
        const op = opcode.toLowerCase();
        if (op === wanted || (wanted.endsWith('_') && op.startsWith(wanted))) total += count;
    }
    return total;
}

const SCRATCH_ONLY_HINT = 'Diese Prüfung gilt nur für Scratch-Projekte (.sb3).';
const TEXT_ONLY_HINT = 'Diese Prüfung gilt nur für Code-Dateien.';

function evaluate(check: HomeworkCheck, analysis: HomeworkAnalysis): { passed: boolean; detail: string } {
    const stats = analysis.scratch;
    const needle = String(check.value ?? '').trim();

    const needsScratch = (): { passed: boolean; detail: string } | null =>
        stats ? null : { passed: false, detail: SCRATCH_ONLY_HINT };

    switch (check.type) {
        case 'minSprites': {
            const blocked = needsScratch();
            if (blocked) return blocked;
            const min = numericValue(check);
            return { passed: stats!.spriteCount >= min, detail: `${stats!.spriteCount} von ${plural(min, 'Figur', 'Figuren')}` };
        }
        case 'minBlocks': {
            const blocked = needsScratch();
            if (blocked) return blocked;
            const min = numericValue(check);
            return { passed: stats!.blockCount >= min, detail: `${stats!.blockCount} von ${plural(min, 'Block', 'Blöcken')}` };
        }
        case 'minScripts': {
            const blocked = needsScratch();
            if (blocked) return blocked;
            const min = numericValue(check);
            return { passed: stats!.scriptCount >= min, detail: `${stats!.scriptCount} von ${plural(min, 'Skript', 'Skripten')}` };
        }
        case 'minCostumes': {
            const blocked = needsScratch();
            if (blocked) return blocked;
            const min = numericValue(check);
            return { passed: stats!.costumeCount >= min, detail: `${stats!.costumeCount} von ${plural(min, 'Kostüm', 'Kostümen')}` };
        }
        case 'minSounds': {
            const blocked = needsScratch();
            if (blocked) return blocked;
            const min = numericValue(check);
            return { passed: stats!.soundCount >= min, detail: `${stats!.soundCount} von ${plural(min, 'Klang', 'Klängen')}` };
        }
        case 'requiredOpcode': {
            const blocked = needsScratch();
            if (blocked) return blocked;
            const wanted = Math.max(1, Math.floor(Number(check.count) || 1));
            const found = countOpcode(stats!, needle);
            return { passed: found >= wanted, detail: `${found}× gefunden, ${wanted}× gebraucht` };
        }
        case 'requiredVariable': {
            const blocked = needsScratch();
            if (blocked) return blocked;
            if (!needle) {
                return { passed: stats!.variableNames.length > 0, detail: `${plural(stats!.variableNames.length, 'Variable', 'Variablen')} gefunden` };
            }
            const found = stats!.variableNames.some(n => n.toLowerCase() === needle.toLowerCase());
            return { passed: found, detail: found ? 'gefunden' : `nicht gefunden (vorhanden: ${stats!.variableNames.join(', ') || 'keine'})` };
        }
        case 'requiredList': {
            const blocked = needsScratch();
            if (blocked) return blocked;
            if (!needle) {
                return { passed: stats!.listNames.length > 0, detail: `${plural(stats!.listNames.length, 'Liste', 'Listen')} gefunden` };
            }
            const found = stats!.listNames.some(n => n.toLowerCase() === needle.toLowerCase());
            return { passed: found, detail: found ? 'gefunden' : `nicht gefunden (vorhanden: ${stats!.listNames.join(', ') || 'keine'})` };
        }
        case 'requiredExtension': {
            const blocked = needsScratch();
            if (blocked) return blocked;
            const found = stats!.extensions.some(e => e.toLowerCase() === needle.toLowerCase());
            return { passed: found, detail: found ? 'benutzt' : 'nicht benutzt' };
        }
        case 'containsText': {
            const found = analysis.text.toLowerCase().includes(needle.toLowerCase());
            return { passed: found, detail: found ? 'gefunden' : 'nicht gefunden' };
        }
        case 'notContainsText': {
            const found = analysis.text.toLowerCase().includes(needle.toLowerCase());
            return { passed: !found, detail: found ? 'kommt noch vor' : 'kommt nicht vor' };
        }
        case 'minLines': {
            if (analysis.kind !== 'text') return { passed: false, detail: TEXT_ONLY_HINT };
            const min = numericValue(check);
            const lines = analysis.text.split('\n').filter(l => l.trim().length > 0).length;
            return { passed: lines >= min, detail: `${lines} von ${plural(min, 'Zeile', 'Zeilen')}` };
        }
        default:
            return { passed: false, detail: 'Unbekannte Prüfung' };
    }
}

/**
 * Fallback when the teacher configured no checks: the hand-in still has to be
 * a file the system can make sense of, so "passed" keeps meaning something.
 */
function defaultResult(analysis: HomeworkAnalysis): HomeworkCheckResult {
    if (analysis.kind === 'scratch') {
        const blocks = analysis.scratch?.blockCount ?? 0;
        return {
            type: 'file',
            label: 'Gültiges Scratch-Projekt mit mindestens einem Block',
            passed: blocks > 0,
            detail: `${plural(blocks, 'Block', 'Blöcke')} gefunden`,
        };
    }
    const lines = analysis.text.split('\n').filter(l => l.trim().length > 0).length;
    return {
        type: 'file',
        label: 'Datei enthält Code',
        passed: lines > 0,
        detail: `${plural(lines, 'Zeile', 'Zeilen')} gefunden`,
    };
}

export interface HomeworkTestRun {
    passed: boolean;
    score: number;
    total: number;
    results: HomeworkCheckResult[];
}

export function runHomeworkTests(
    filePath: string,
    fileName: string,
    rawChecks: unknown,
): HomeworkTestRun {
    const analysis = analyzeHomeworkFile(filePath, fileName);
    const checks = normalizeChecks(rawChecks);

    // A file we cannot even open fails as a whole — running the individual
    // checks against nothing would only produce confusing messages.
    if (analysis.error) {
        const results: HomeworkCheckResult[] = [
            { type: 'file', label: 'Datei kann gelesen werden', passed: false, detail: analysis.error },
        ];
        return { passed: false, score: 0, total: 1, results };
    }

    const results: HomeworkCheckResult[] = checks.length === 0
        ? [defaultResult(analysis)]
        : checks.map(check => {
            const { passed, detail } = evaluate(check, analysis);
            return { type: check.type, label: describeCheck(check), passed, detail };
        });

    const score = results.filter(r => r.passed).length;
    return { passed: score === results.length, score, total: results.length, results };
}
