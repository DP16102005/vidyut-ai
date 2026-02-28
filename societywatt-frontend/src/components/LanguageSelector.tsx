import React from 'react';

const LANGUAGES = [
    { code: 'auto', label: 'Auto-detect' },
    { code: 'en', label: 'English' },
    { code: 'hi', label: '\u0939\u093f\u0928\u094d\u0926\u0940' },
    { code: 'ta', label: '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd' },
    { code: 'te', label: '\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41' },
    { code: 'kn', label: '\u0c95\u0ca8\u0ccd\u0ca8\u0ca1' },
    { code: 'mr', label: '\u092e\u0930\u093e\u0920\u0940' },
    { code: 'bn', label: '\u09ac\u09be\u0982\u09b2\u09be' },
    { code: 'gu', label: '\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0' },
    { code: 'pa', label: '\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40' },
    { code: 'ml', label: '\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02' },
    { code: 'or', label: '\u0b13\u0b21\u0b3c\u0b3f\u0b06' },
];

interface LanguageSelectorProps {
    value: string;
    onChange: (lang: string) => void;
    compact?: boolean;
}

export default function LanguageSelector({ value, onChange, compact = false }: LanguageSelectorProps) {
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{ width: compact ? 100 : 180 }}
        >
            {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
            ))}
        </select>
    );
}
