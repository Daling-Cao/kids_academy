import { Plus, Trash2 } from 'lucide-react';
import type { HomeworkCheck, HomeworkCheckType } from '../types';
import { CHECK_TYPES, CHECK_TYPE_ORDER, OPCODE_PRESETS, describeCheck } from '../lib/homeworkChecks';

// Teacher-side builder for the automatic homework tests. Every row is one
// condition the handed-in file has to satisfy; all of them must pass for the
// student to earn the homework BlockCoin.
export default function HomeworkChecksEditor({ checks, onChange }: {
    checks: HomeworkCheck[];
    onChange: (checks: HomeworkCheck[]) => void;
}) {
    const updateCheck = (index: number, patch: Partial<HomeworkCheck>) => {
        onChange(checks.map((c, i) => (i === index ? { ...c, ...patch } : c)));
    };

    const changeType = (index: number, type: HomeworkCheckType) => {
        // The value belongs to the old check type, so reset it to the new
        // type's default rather than carrying a nonsense value over.
        updateCheck(index, { type, value: CHECK_TYPES[type].defaultValue, count: undefined });
    };

    const addCheck = () => {
        onChange([...checks, { type: 'minBlocks', value: CHECK_TYPES.minBlocks.defaultValue }]);
    };

    const removeCheck = (index: number) => {
        onChange(checks.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            <div className="rounded-xl border-2 border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-bold mb-1">So funktioniert der automatische Test</p>
                <p>
                    Die abgegebene Datei wird nur <strong>angeschaut</strong>, nie ausgeführt. Bei Scratch-Dateien
                    (.sb3) wird das Projekt geöffnet und gezählt (Figuren, Blöcke, Variablen …), bei Code-Dateien
                    wird der Text durchsucht. Alle Prüfungen müssen bestanden sein, damit es den extra BlockCoin gibt.
                </p>
                <p className="mt-2">
                    Ohne eigene Prüfungen wird nur getestet, ob die Datei überhaupt ein gültiges Projekt mit Inhalt ist.
                </p>
            </div>

            <div className="space-y-3">
                {checks.map((check, index) => {
                    const meta = CHECK_TYPES[check.type];
                    return (
                        <div key={index} className="rounded-xl border-2 border-stone-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start">
                                <div className="md:w-1/3">
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">Prüfung</label>
                                    <select
                                        value={check.type}
                                        onChange={(e) => changeType(index, e.target.value as HomeworkCheckType)}
                                        className="w-full rounded-xl border-2 border-orange-100 bg-white px-3 py-2 focus:border-orange-400 focus:outline-none"
                                    >
                                        {CHECK_TYPE_ORDER.map(type => (
                                            <option key={type} value={type}>{CHECK_TYPES[type].name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:w-1/3">
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">
                                        {meta.valueKind === 'number' ? 'Mindestanzahl' : 'Wert'}
                                    </label>
                                    {meta.valueKind === 'number' ? (
                                        <input
                                            type="number"
                                            min={1}
                                            value={String(check.value ?? '')}
                                            onChange={(e) => updateCheck(index, { value: Number(e.target.value) })}
                                            className="w-full rounded-xl border-2 border-orange-100 px-3 py-2 focus:border-orange-400 focus:outline-none"
                                            placeholder={meta.placeholder}
                                        />
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                list={meta.valueKind === 'opcode' ? 'homework-opcode-presets' : undefined}
                                                value={String(check.value ?? '')}
                                                onChange={(e) => updateCheck(index, { value: e.target.value })}
                                                className="w-full rounded-xl border-2 border-orange-100 px-3 py-2 focus:border-orange-400 focus:outline-none"
                                                placeholder={meta.placeholder}
                                            />
                                            {meta.valueKind === 'opcode' && (
                                                <select
                                                    value=""
                                                    onChange={(e) => e.target.value && updateCheck(index, { value: e.target.value })}
                                                    className="mt-2 w-full rounded-xl border-2 border-stone-100 bg-stone-50 px-3 py-2 text-sm text-stone-600 focus:border-orange-400 focus:outline-none"
                                                >
                                                    <option value="">Baustein aus der Liste wählen …</option>
                                                    {OPCODE_PRESETS.map(p => (
                                                        <option key={p.opcode} value={p.opcode}>{p.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </>
                                    )}
                                </div>

                                {check.type === 'requiredOpcode' && (
                                    <div className="md:w-24">
                                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">Anzahl</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={check.count ?? 1}
                                            onChange={(e) => updateCheck(index, { count: Math.max(1, Number(e.target.value) || 1) })}
                                            className="w-full rounded-xl border-2 border-orange-100 px-3 py-2 focus:border-orange-400 focus:outline-none"
                                        />
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => removeCheck(index)}
                                    className="self-end rounded-xl border border-red-200 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100"
                                    title="Prüfung entfernen"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="mt-3">
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">
                                    Eigener Text für die Schüler (optional)
                                </label>
                                <input
                                    type="text"
                                    value={check.label || ''}
                                    onChange={(e) => updateCheck(index, { label: e.target.value })}
                                    className="w-full rounded-xl border-2 border-orange-100 px-3 py-2 focus:border-orange-400 focus:outline-none"
                                    placeholder={describeCheck({ ...check, label: '' })}
                                />
                                <p className="mt-1 text-xs text-stone-500">{meta.hint}</p>
                            </div>
                        </div>
                    );
                })}

                {checks.length === 0 && (
                    <p className="rounded-xl border-2 border-dashed border-stone-200 p-6 text-center text-stone-500">
                        Noch keine Prüfungen. Ohne Prüfungen wird nur kontrolliert, ob die Datei ein gültiges Projekt mit Inhalt ist.
                    </p>
                )}
            </div>

            <datalist id="homework-opcode-presets">
                {OPCODE_PRESETS.map(p => (
                    <option key={p.opcode} value={p.opcode}>{p.name}</option>
                ))}
            </datalist>

            <button
                type="button"
                onClick={addCheck}
                disabled={checks.length >= 15}
                className="flex items-center gap-1 rounded-xl bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700 transition-colors hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Plus size={18} /> Prüfung hinzufügen
            </button>

            {checks.length > 0 && (
                <div className="rounded-xl border-2 border-emerald-100 bg-emerald-50 p-4">
                    <p className="mb-2 text-sm font-bold text-emerald-800">Das sehen die Schüler nach der Abgabe:</p>
                    <ul className="space-y-1 text-sm text-emerald-900">
                        {checks.map((check, index) => (
                            <li key={index}>✅ {describeCheck(check)}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
