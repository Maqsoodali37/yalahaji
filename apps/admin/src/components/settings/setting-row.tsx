'use client'

import { useState } from 'react'
import { Check, X, Pencil, Trash2, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/panel'
import { Input, Textarea, Checkbox } from '@/components/ui/field'
import { canManage, useAuth } from '@/lib/auth'
import type { Setting } from '@/types'

/** `Setting.value` is always a string; this renders/parses it per `valueType`. */
function isValidForType(value: string, type: Setting['valueType']): boolean {
  if (type === 'number') return value.trim() !== '' && Number.isFinite(Number(value))
  if (type === 'boolean') return value === 'true' || value === 'false'
  if (type === 'json') {
    try {
      JSON.parse(value)
      return true
    } catch {
      return false
    }
  }
  return true
}

export function SettingRow({
  setting,
  saving,
  onSave,
  onDelete,
  onViewHistory,
}: {
  setting: Setting
  saving: boolean
  onSave: (value: string, isPublic: boolean) => void
  onDelete: () => void
  onViewHistory: () => void
}) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [draftValue, setDraftValue] = useState(setting.value)
  const [draftPublic, setDraftPublic] = useState(setting.isPublic)
  const [error, setError] = useState<string | null>(null)

  const canDelete = user?.role === 'admin'

  function startEdit() {
    setDraftValue(setting.value)
    setDraftPublic(setting.isPublic)
    setError(null)
    setEditing(true)
  }

  function save() {
    if (!isValidForType(draftValue, setting.valueType)) {
      setError(
        setting.valueType === 'number'
          ? 'Must be a number.'
          : setting.valueType === 'boolean'
            ? 'Must be true or false.'
            : 'Must be valid JSON.',
      )
      return
    }
    onSave(draftValue, draftPublic)
    setEditing(false)
  }

  return (
    <tr>
      <td className="align-top">
        <div className="font-mono text-[12px] text-ink font-medium">{setting.key}</div>
        {setting.description && (
          <div className="text-xs text-ink-3 mt-0.5 max-w-xs">{setting.description}</div>
        )}
      </td>
      <td className="align-top">
        <Badge className="uppercase text-[10px] tracking-wide">{setting.valueType}</Badge>
      </td>
      <td className="align-top max-w-sm">
        {editing ? (
          <div>
            {setting.valueType === 'boolean' ? (
              <Select
                value={draftValue}
                onChange={setDraftValue}
              />
            ) : setting.valueType === 'json' ? (
              <Textarea
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                rows={3}
                className="font-mono text-xs"
                autoFocus
              />
            ) : (
              <Input
                type="text"
                inputMode={setting.valueType === 'number' ? 'decimal' : undefined}
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') save()
                  if (e.key === 'Escape') setEditing(false)
                }}
              />
            )}
            {error && <p className="error-text mt-1">{error}</p>}
            <div className="mt-2">
              <Checkbox
                label="Public (exposed to the storefront)"
                checked={draftPublic}
                onChange={(e) => setDraftPublic(e.target.checked)}
              />
            </div>
          </div>
        ) : (
          <code className="text-xs text-ink-2 break-all">{setting.value}</code>
        )}
      </td>
      <td className="align-top">
        <Badge className={setting.isPublic ? 'bg-green-light text-[#137A4C]' : 'bg-paper text-ink-3'}>
          {setting.isPublic ? 'Public' : 'Private'}
        </Badge>
      </td>
      <td className="align-top">
        <div className="flex items-center justify-end gap-1">
          {editing ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={save}
                disabled={saving}
                aria-label="Save"
              >
                <Check className="h-3.5 w-3.5 text-green" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditing(false)}
                aria-label="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" onClick={onViewHistory} aria-label="View history">
                <History className="h-3.5 w-3.5" />
              </Button>
              {canManage(user?.role) && (
                <Button variant="ghost" size="icon" onClick={startEdit} aria-label="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {canDelete && (
                <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5 text-alert" />
                </Button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

/** Inline `true`/`false` select — a boolean value is stored as the string. */
function Select({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      className="field cursor-pointer"
      value={value === 'true' ? 'true' : 'false'}
      onChange={(e) => onChange(e.target.value)}
      autoFocus
    >
      <option value="true">true</option>
      <option value="false">false</option>
    </select>
  )
}
