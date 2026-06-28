import { PALETTE_PRESETS } from '../palette'

type PalettePresetPickerProps = {
  presetId: string
  onPresetIdChange: (id: string) => void
  label?: string
}

export default function PalettePresetPicker({
  presetId,
  onPresetIdChange,
  label = 'Kit',
}: PalettePresetPickerProps) {
  const selected = PALETTE_PRESETS.find((p) => p.id === presetId)

  return (
    <label className="trace-field">
      <span>{label}</span>
      <select
        value={presetId}
        onChange={(e) => onPresetIdChange(e.target.value)}
      >
        {PALETTE_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </select>
      {selected && (
        <span className="trace-field-hint">{selected.description}</span>
      )}
    </label>
  )
}
