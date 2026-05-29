import { PredefinedTasksSection } from '../components/tasks/PredefinedTasksSection'

export function PredefinedTasksPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-24">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-800">Predefined Tasks</h1>
        <p className="text-slate-500 text-sm mt-1">
          Global library of standard tasks shared across all projects. Hover a task to edit or delete it.
        </p>
      </div>

      <PredefinedTasksSection mode="page" />
    </div>
  )
}
