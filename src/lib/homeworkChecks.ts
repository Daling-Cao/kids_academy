// Shared (client + server) metadata for homework checks.
//
// Kept free of Node imports so the teacher editor can render the same labels
// the server uses when it reports a test result back to the student.

import type { HomeworkCheck, HomeworkCheckType } from '../types';

export type CheckValueKind = 'number' | 'text' | 'opcode';
export type CheckScope = 'scratch' | 'text' | 'both';

export interface CheckTypeMeta {
    /** German name of the check, shown in the teacher's dropdown. */
    name: string;
    /** What the teacher types into the value field. */
    valueKind: CheckValueKind;
    /** Which kind of handed-in file the check can be applied to. */
    scope: CheckScope;
    placeholder: string;
    /** Short hint under the row in the editor. */
    hint: string;
    defaultValue: string | number;
}

export const CHECK_TYPES: Record<HomeworkCheckType, CheckTypeMeta> = {
    minSprites: {
        name: 'Mindestens X Figuren (Sprites)',
        valueKind: 'number',
        scope: 'scratch',
        placeholder: '2',
        hint: 'Die Bühne zählt nicht mit.',
        defaultValue: 2,
    },
    minBlocks: {
        name: 'Mindestens X Blöcke',
        valueKind: 'number',
        scope: 'scratch',
        placeholder: '10',
        hint: 'Alle Blöcke in allen Figuren zusammen.',
        defaultValue: 10,
    },
    minScripts: {
        name: 'Mindestens X Skripte',
        valueKind: 'number',
        scope: 'scratch',
        placeholder: '2',
        hint: 'Ein Skript ist ein zusammenhängender Blockstapel.',
        defaultValue: 2,
    },
    minCostumes: {
        name: 'Mindestens X Kostüme',
        valueKind: 'number',
        scope: 'scratch',
        placeholder: '2',
        hint: 'Alle Kostüme aller Figuren zusammen.',
        defaultValue: 2,
    },
    minSounds: {
        name: 'Mindestens X Klänge',
        valueKind: 'number',
        scope: 'scratch',
        placeholder: '1',
        hint: 'Alle Klänge aller Figuren zusammen.',
        defaultValue: 1,
    },
    requiredOpcode: {
        name: 'Bestimmter Block wird benutzt',
        valueKind: 'opcode',
        scope: 'scratch',
        placeholder: 'control_repeat',
        hint: 'Baustein aus der Liste wählen oder Opcode eintippen.',
        defaultValue: 'control_repeat',
    },
    requiredVariable: {
        name: 'Variable vorhanden',
        valueKind: 'text',
        scope: 'scratch',
        placeholder: 'Punkte (leer = irgendeine Variable)',
        hint: 'Groß-/Kleinschreibung egal. Leer lassen für „mindestens eine Variable“.',
        defaultValue: '',
    },
    requiredList: {
        name: 'Liste vorhanden',
        valueKind: 'text',
        scope: 'scratch',
        placeholder: 'Highscore (leer = irgendeine Liste)',
        hint: 'Groß-/Kleinschreibung egal. Leer lassen für „mindestens eine Liste“.',
        defaultValue: '',
    },
    requiredExtension: {
        name: 'Erweiterung benutzt',
        valueKind: 'text',
        scope: 'scratch',
        placeholder: 'pen',
        hint: 'z. B. pen (Malstift), music (Musik), text2speech.',
        defaultValue: 'pen',
    },
    containsText: {
        name: 'Text kommt vor',
        valueKind: 'text',
        scope: 'both',
        placeholder: 'while',
        hint: 'Bei Scratch wird im Projekt-Code gesucht (z. B. Nachrichtenname).',
        defaultValue: '',
    },
    notContainsText: {
        name: 'Text kommt NICHT vor',
        valueKind: 'text',
        scope: 'both',
        placeholder: 'TODO',
        hint: 'Praktisch, um Platzhalter aus der Vorlage zu verbieten.',
        defaultValue: '',
    },
    minLines: {
        name: 'Mindestens X Code-Zeilen',
        valueKind: 'number',
        scope: 'text',
        placeholder: '15',
        hint: 'Nur für Code-Dateien (.py, .ino, .js …). Leerzeilen zählen nicht.',
        defaultValue: 15,
    },
};

export const CHECK_TYPE_ORDER: HomeworkCheckType[] = [
    'minSprites',
    'minBlocks',
    'minScripts',
    'requiredOpcode',
    'requiredVariable',
    'requiredList',
    'minCostumes',
    'minSounds',
    'requiredExtension',
    'containsText',
    'notContainsText',
    'minLines',
];

/** Common Scratch blocks with a kid-friendly German name. */
export const OPCODE_PRESETS: { opcode: string; name: string }[] = [
    { opcode: 'event_whenflagclicked', name: 'Wenn die grüne Flagge angeklickt' },
    { opcode: 'event_whenkeypressed', name: 'Wenn Taste gedrückt' },
    { opcode: 'event_whenthisspriteclicked', name: 'Wenn diese Figur angeklickt' },
    { opcode: 'event_broadcast', name: 'Sende Nachricht' },
    { opcode: 'event_whenbroadcastreceived', name: 'Wenn ich Nachricht empfange' },
    { opcode: 'control_wait', name: 'Warte ( ) Sekunden' },
    { opcode: 'control_repeat', name: 'Wiederhole ( ) mal' },
    { opcode: 'control_forever', name: 'Wiederhole fortlaufend' },
    { opcode: 'control_repeat_until', name: 'Wiederhole bis' },
    { opcode: 'control_if', name: 'Falls … dann' },
    { opcode: 'control_if_else', name: 'Falls … dann … sonst' },
    { opcode: 'control_create_clone_of', name: 'Erzeuge Klon' },
    { opcode: 'motion_movesteps', name: 'Gehe ( ) er Schritt' },
    { opcode: 'motion_turnright', name: 'Drehe dich nach rechts' },
    { opcode: 'motion_gotoxy', name: 'Gehe zu x: ( ) y: ( )' },
    { opcode: 'motion_glidesecstoxy', name: 'Gleite in ( ) Sek. zu x/y' },
    { opcode: 'motion_ifonedgebounce', name: 'Pralle vom Rand ab' },
    { opcode: 'looks_sayforsecs', name: 'Sage ( ) für ( ) Sekunden' },
    { opcode: 'looks_say', name: 'Sage ( )' },
    { opcode: 'looks_switchcostumeto', name: 'Wechsle zu Kostüm' },
    { opcode: 'looks_nextcostume', name: 'Nächstes Kostüm' },
    { opcode: 'looks_changesizeby', name: 'Ändere Größe um' },
    { opcode: 'sound_play', name: 'Spiele Klang' },
    { opcode: 'sound_playuntildone', name: 'Spiele Klang bis fertig' },
    { opcode: 'sensing_touchingobject', name: 'Wird … berührt?' },
    { opcode: 'sensing_askandwait', name: 'Frage ( ) und warte' },
    { opcode: 'sensing_keypressed', name: 'Taste ( ) gedrückt?' },
    { opcode: 'data_setvariableto', name: 'Setze Variable auf ( )' },
    { opcode: 'data_changevariableby', name: 'Ändere Variable um ( )' },
    { opcode: 'data_addtolist', name: 'Füge zu Liste hinzu' },
    { opcode: 'operator_add', name: 'Rechnen: ( ) + ( )' },
    { opcode: 'operator_random', name: 'Zufallszahl von ( ) bis ( )' },
    { opcode: 'operator_equals', name: 'Vergleich: ( ) = ( )' },
    { opcode: 'operator_join', name: 'Verbinde ( ) und ( )' },
    { opcode: 'procedures_definition', name: 'Eigener Block (Funktion)' },
    { opcode: 'pen_penDown', name: 'Malstift: Stift runter' },
];

export function opcodeName(opcode: string): string {
    return OPCODE_PRESETS.find(p => p.opcode === opcode)?.name || opcode;
}

function numericValue(check: HomeworkCheck): number {
    const n = Number(check.value);
    return Number.isFinite(n) ? n : 0;
}

/** German singular/plural, so a check never reads "1 Blöcke". */
export function plural(n: number, one: string, many: string): string {
    return `${n} ${n === 1 ? one : many}`;
}

/**
 * The German sentence a student sees for a check — the teacher's own label wins,
 * otherwise one is generated from the check itself.
 */
export function describeCheck(check: HomeworkCheck): string {
    if (check.label && check.label.trim()) return check.label.trim();
    const value = String(check.value ?? '').trim();

    switch (check.type) {
        case 'minSprites': return `Mindestens ${plural(numericValue(check), 'Figur', 'Figuren')} im Projekt`;
        case 'minBlocks': return `Mindestens ${plural(numericValue(check), 'Block', 'Blöcke')} im Projekt`;
        case 'minScripts': return `Mindestens ${plural(numericValue(check), 'Skript', 'Skripte')} im Projekt`;
        case 'minCostumes': return `Mindestens ${plural(numericValue(check), 'Kostüm', 'Kostüme')} im Projekt`;
        case 'minSounds': return `Mindestens ${plural(numericValue(check), 'Klang', 'Klänge')} im Projekt`;
        case 'requiredOpcode': {
            const times = check.count && check.count > 1 ? ` (${check.count}×)` : '';
            return `Block „${opcodeName(value)}“ wird benutzt${times}`;
        }
        case 'requiredVariable':
            return value ? `Variable „${value}“ ist vorhanden` : 'Mindestens eine Variable ist vorhanden';
        case 'requiredList':
            return value ? `Liste „${value}“ ist vorhanden` : 'Mindestens eine Liste ist vorhanden';
        case 'requiredExtension': return `Erweiterung „${value}“ wird benutzt`;
        case 'containsText': return `Der Text „${value}“ kommt vor`;
        case 'notContainsText': return `Der Text „${value}“ kommt nicht mehr vor`;
        case 'minLines': return `Mindestens ${plural(numericValue(check), 'Code-Zeile', 'Code-Zeilen')}`;
        default: return 'Prüfung';
    }
}

/** Drops rows the teacher left half-filled so they never fail a student. */
export function isCheckComplete(check: HomeworkCheck): boolean {
    const meta = CHECK_TYPES[check.type];
    if (!meta) return false;
    if (meta.valueKind === 'number') return numericValue(check) > 0;
    // requiredVariable / requiredList are meaningful with an empty value
    // ("any variable"), every other text check needs a needle.
    if (check.type === 'requiredVariable' || check.type === 'requiredList') return true;
    return String(check.value ?? '').trim().length > 0;
}

export function normalizeChecks(raw: unknown): HomeworkCheck[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((c: any) => c && typeof c === 'object' && CHECK_TYPES[c.type as HomeworkCheckType])
        .map((c: any): HomeworkCheck => ({
            type: c.type,
            value: typeof c.value === 'number' ? c.value : String(c.value ?? ''),
            ...(c.count && Number(c.count) > 1 ? { count: Math.floor(Number(c.count)) } : {}),
            ...(c.label ? { label: String(c.label).slice(0, 200) } : {}),
        }))
        .filter(isCheckComplete)
        .slice(0, 15);
}
