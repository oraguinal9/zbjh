import { supabase, getCurrentUser } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { ChapterEditor } from "./editor";
import { SidebarClient } from "./sidebar-client";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!project) return <div className="min-h-screen bg-gray-950 text-gray-100 p-8">作品不存在</div>;

  const { data: volumes } = await supabase.from("volumes").select("*").eq("project_id", id).order("sort_order");
  const volIds = (volumes || []).map((v: any) => v.id);
  const { data: chapters } = await supabase.from("chapters").select("*").in("volume_id", volIds.length ? volIds : ["none"]).order("sort_order");
  const { data: characters } = await supabase.from("characters").select("*").eq("project_id", id).order("created_at");
  const { data: allProjects } = await supabase.from("projects").select("id, title").eq("user_id", user.id).order("updated_at", { ascending: false });

  const volInfo = (volumes || []).map((v: any) => ({
    id: v.id, title: v.title, sort_order: v.sort_order,
    chapterCount: (chapters || []).filter((c: any) => c.volume_id === v.id).length,
  }));

  // 提取每卷的章节范围：优先从标题（新作品），兜底从大纲文本（旧作品）
  const chapterRanges: Record<string, string> = {};
  for (const v of volumes || []) {
    const titleMatch = v.title.match(/（(\d+-\d+)章）$/);
    if (titleMatch) { chapterRanges[v.id] = titleMatch[1]; }
  }
  if (project.outline && Object.keys(chapterRanges).length === 0) {
    const sections = project.outline.split(/【第\d+卷完】/);
    (volumes || []).forEach((v: any, i: number) => {
      const section = sections[i];
      if (section) {
        const m = section.match(/章节范围[：:]\s*(\d+-\d+)/);
        if (m) chapterRanges[v.id] = m[1];
      }
    });
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex">
      <aside className="w-64 border-r border-gray-800 h-screen overflow-y-auto p-3 flex-shrink-0">
        <SidebarClient
          projectId={id}
          projectTitle={project.title}
          genre={project.genre}
          idea={project.summary}
          volumes={volInfo}
          allChapters={chapters || []}
          allProjects={allProjects || []}
          currentProjectId={id}
          chapterRanges={chapterRanges}
        />
      </aside>

      <ChapterEditor projectId={id} project={project} chapters={chapters || []} characters={characters || []} dbVolumes={volumes || []} />
    </main>
  );
}
