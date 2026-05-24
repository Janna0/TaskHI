import { use } from 'react';
import { createClient } from '@/lib/supabase/server';
import { asProject, asSections, asTasks } from '@/lib/supabase/query';
import ListViewClient from './ListViewClient';

const DEFAULT_SECTIONS = ['To Do', 'In Progress', 'Done'];

export default async function ListViewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const supabase = await createClient();

  const [projRes, sectRes, taskRes] = await Promise.all([
    supabase.from('projects').select('id, name, color').eq('id', projectId).single(),
    supabase.from('sections').select('*').eq('project_id', projectId).order('position'),
    supabase.from('tasks').select('*').eq('project_id', projectId).is('parent_task_id', null).order('position'),
  ]);

  const project = asProject(projRes.data) ?? {
    id: projectId, name: 'Project', color: 'indigo', owner_id: '',
    description: null, status: 'active' as const, visibility: 'team' as const,
    deadline: null, is_favorite: false, board_columns: null, created_at: '', updated_at: '',
  };

  let sections = asSections(sectRes.data);

  // Add any of the three default sections that don't exist yet by name
  const existingNames = new Set(sections.map(s => s.name));
  const missing = DEFAULT_SECTIONS.filter(name => !existingNames.has(name));

  if (missing.length > 0) {
    const basePos = sections.length > 0
      ? Math.max(...sections.map(s => s.position)) + 1
      : 0;
    await supabase.from('sections').insert(
      missing.map((name, i) => ({ project_id: projectId, name, position: basePos + i }))
    );
    const { data: seeded } = await supabase
      .from('sections').select('*').eq('project_id', projectId).order('position');
    sections = asSections(seeded);
  }

  return (
    <ListViewClient
      project={{ id: project.id, name: project.name, color: project.color }}
      sections={sections}
      tasks={asTasks(taskRes.data)}
    />
  );
}

