import { useState, useEffect } from 'react'
import { BookOpen, Upload, FileText, Trash2, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '../lib/utils'

interface Doc {
  id: string
  name: string
  created_at: string
  metadata: { size: number; mimetype?: string } | null
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function HowToPage() {
  const { user } = useAuth()
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.storage
      .from('how-to-docs')
      .list(user!.id, { sortBy: { column: 'created_at', order: 'desc' } })
    if (data) setDocs(data as Doc[])
    setLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    setUploadError(null)
    for (const file of files) {
      const path = `${user!.id}/${file.name}`
      const { error } = await supabase.storage
        .from('how-to-docs')
        .upload(path, file, { upsert: true })
      if (error) { setUploadError(error.message); setUploading(false); return }
    }
    setUploading(false)
    e.target.value = ''
    load()
  }

  async function handleOpen(doc: Doc) {
    const { data } = await supabase.storage
      .from('how-to-docs')
      .createSignedUrl(`${user!.id}/${doc.name}`, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(doc: Doc) {
    if (!confirm(`Delete "${doc.name}"?`)) return
    await supabase.storage.from('how-to-docs').remove([`${user!.id}/${doc.name}`])
    setDocs(prev => prev.filter(d => d.id !== doc.id))
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">How To</h1>
          <p className="text-slate-500 text-sm mt-1">Reference documents for common tasks.</p>
        </div>
        <label className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          uploading
            ? 'bg-slate-100 text-slate-400 cursor-wait'
            : 'bg-primary-600 text-white hover:bg-primary-700 cursor-pointer'
        )}>
          <Upload size={15} />
          {uploading ? 'Uploading…' : 'Upload document'}
          <input
            type="file"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={handleUpload}
          />
        </label>
      </div>

      {uploadError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {uploadError}
        </div>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : docs.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No documents yet</p>
          <p className="text-slate-400 text-sm mt-1">Upload how-to documents to keep them handy.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-4 px-4 py-3 bg-white rounded-lg border border-slate-100 hover:border-slate-200 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                <FileText size={18} className="text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                {doc.metadata?.size != null && (
                  <p className="text-xs text-slate-400 mt-0.5">{formatSize(doc.metadata.size)}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleOpen(doc)}
                  className="p-2 rounded-md text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  title="Open"
                >
                  <ExternalLink size={15} />
                </button>
                <button
                  onClick={() => handleDelete(doc)}
                  className="p-2 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
