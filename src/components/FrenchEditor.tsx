'use client'

import { useRef, useState } from 'react'

interface FrenchEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

// Characters grouped by base vowel / consonant. Each entry: [lowercase, uppercase]
const CHAR_PAIRS: [string, string][] = [
  ['é', 'É'],
  ['è', 'È'],
  ['ê', 'Ê'],
  ['ë', 'Ë'],
  ['à', 'À'],
  ['â', 'Â'],
  ['ù', 'Ù'],
  ['û', 'Û'],
  ['ü', 'Ü'],
  ['ô', 'Ô'],
  ['î', 'Î'],
  ['ï', 'Ï'],
  ['ç', 'Ç'],
  ['œ', 'Œ'],
  ['æ', 'Æ'],
  ['«', '«'],
  ['»', '»'],
]

export function FrenchEditor({ value, onChange, disabled, placeholder }: FrenchEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [shifted, setShifted] = useState(false)

  function insertChar(char: string) {
    const el = textareaRef.current
    if (!el) return

    const start = el.selectionStart
    const end = el.selectionEnd
    const next = value.slice(0, start) + char + value.slice(end)

    onChange(next)

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + char.length, start + char.length)
    })
  }

  return (
    <div className="flex flex-col rounded-lg border border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden">
      {/* Toolbar — pinned to the top of the editor; textarea scrolls independently below */}
      <div className="flex flex-wrap items-center gap-1 bg-gray-50 border-b border-gray-200 px-3 py-2 shrink-0">
        {/* Shift toggle */}
        <button
          type="button"
          onClick={() => setShifted((s) => !s)}
          className={`h-7 w-8 rounded text-xs font-semibold transition-colors ${
            shifted
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'
          }`}
          title="Toggle uppercase"
        >
          ⇧
        </button>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        {CHAR_PAIRS.map(([lower, upper]) => {
          const char = shifted ? upper : lower
          const isSymbol = lower === '«' || lower === '»'
          return (
            <button
              key={lower}
              type="button"
              onClick={() => insertChar(char)}
              disabled={disabled}
              className={`h-7 min-w-[1.75rem] px-1 rounded border text-sm font-medium transition-colors disabled:opacity-40 ${
                isSymbol
                  ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
              title={char}
            >
              {char}
            </button>
          )
        })}
      </div>

      {/* Textarea — scrolls on its own; toolbar never overlaps content */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        spellCheck
        lang="fr"
        className="resize-none p-4 text-base text-gray-900 placeholder-gray-400 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-500 leading-relaxed overflow-y-auto"
        style={{ minHeight: '22rem', maxHeight: '60vh' }}
      />
    </div>
  )
}
