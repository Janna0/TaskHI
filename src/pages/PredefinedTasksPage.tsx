import { ListChecks } from 'lucide-react'
import { PredefinedTasksSection } from '../components/tasks/PredefinedTasksSection'

export function PredefinedTasksPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Predefined Tasks</h1>
        <p className="text-slate-500 text-sm mt-1">Global library of standard tasks. Click the pencil icon to edit, trash to delete, or add new ones below.</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <PredefinedTasksSection mode="page" />
      </div>
      <p className="text-xs text-slate-400 mt-4 text-center">
        Changes here are visible to everyone. Run <code className="bg-slate-100 px-1 py-0.5 rounded">scripts/seed_predefined_tasks.sql</code> in Supabase if the list is empty.
      </p>
    </div>
  )
}
