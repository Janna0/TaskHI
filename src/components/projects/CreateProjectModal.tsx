import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../ui/Modal'
import { Input, Textarea } from '../ui/Input'
import { Button } from '../ui/Button'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { PROJECT_COLORS, cn } from '../../lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const DEFAULT_SECTIONS = ['To Do', 'In Progress', 'Done']

export function CreateProjectModal({ open, onClose, onCreated }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!name.trim()) { setError('Project name is required'); return }
    setLoading(true)
    const { data, error: err } = await supabase.from('projects').insert({
      name: name.trim(),
      description,
      color,
      owner_id: user!.id,
    }).select().single()
    if (err) { setLoading(false); setError(err.message); return }
    // Seed default sections
    await supabase.from('sections').insert(
      DEFAULT_SECTIONS.map((sectionName, i) => ({
        project_id: data.id,
        name: sectionName,
        position: i,
      }))
    )
    setLoading(false)
    setName(''); setDescription(''); setColor(PROJECT_COLORS[0]); setError('')
    onCreated()
    navigate(`/projects/${data.id}`)
  }

  return (
    <Modal open={open} onClose={onClose} title="New Project">
      <div className="space-y-4">
        <Input label="Project name" placeholder="e.g. Website Redesign" value={name}
          onChange={e => { setName(e.target.value); setError('') }} error={error} autoFocus />
        <Textarea label="Description (optional)" placeholder="What is this project about?" rows={2}
          value={description} onChange={e => setDescription(e.target.value)} />
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Color</p>
          <div className="flex gap-2 flex-wrap">
            {PROJECT_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={cn('w-7 h-7 rounded-full transition-transform hover:scale-110', color === c && 'ring-2 ring-offset-2 ring-slate-400')}
                style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>Create Project</Button>
        </div>
      </div>
    </Modal>
  )
}
