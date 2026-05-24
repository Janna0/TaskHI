import { use } from 'react';
import { createClient } from '@/lib/supabase/server';
import { asProject, asSections, asTasks } from '@/lib/supabase/query';
import ListViewClient from './ListViewClient';

const DEFAULT_SECTIONS = [
  { name: 'To Do',       position: 0 },
  { name: 'In Progress', position: 1 },
  { name: 'Done',        position: 2 },
];

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

  // Seed default sections for brand-new projects
  if (sections.length === 0) {
    await supabase.from('sections').insert(
      DEFAULT_SECTIONS.map(s => ({ project_id: projectId, ...s }))
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
