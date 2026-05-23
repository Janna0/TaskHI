import { createClient } from '@/lib/supabase/server';
import { asProjects } from '@/lib/supabase/query';
import ProjectsClient from './ProjectsClient';

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: memberRows } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', user!.id);

  const projectIds = ((memberRows ?? []) as { project_id: string }[]).map(r => r.project_id);

  const { data: rawProjects } = projectIds.length > 0
    ? await supabase.from('projects').select('*').in('id', projectIds).order('updated_at', { ascending: false })
    : { data: [] };

  return <ProjectsClient projects={asProjects(rawProjects)} />;
}
