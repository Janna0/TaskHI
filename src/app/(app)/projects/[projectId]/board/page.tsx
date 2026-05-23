import { use } from 'react';
import { createClient } from '@/lib/supabase/server';
import { asProject, asTasks } from '@/lib/supabase/query';
import BoardViewClient from './BoardViewClient';

export default async function BoardViewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const supabase = await createClient();

  const [projRes, taskRes] = await Promise.all([
    supabase.from('projects').select('id, name, color').eq('id', projectId).single(),
    supabase.from('tasks').select('*').eq('project_id', projectId).is('parent_task_id', null).order('position'),
  ]);

  const project = asProject(projRes.data) ?? { id: projectId, name: 'Project', color: 'indigo', owner_id: '', description: null, status: 'active' as const, visibility: 'team' as const, deadline: null, is_favorite: false, board_columns: null, created_at: '', updated_at: '' };

  return (
    <BoardViewClient
      project={{ id: project.id, name: project.name, color: project.color }}
      tasks={asTasks(taskRes.data)}
    />
  );
}
