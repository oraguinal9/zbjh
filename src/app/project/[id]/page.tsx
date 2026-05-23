import { supabase, getCurrentUser } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { ChapterEditor } from "./editor";

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

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex">
      <aside className="w-64 border-r border-gray-800 h-screen overflow-y-auto p-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <a href="/dashboard" className="text-xs text-gray-500 hover:text-white">← 返回</a>
          <div className="relative group">
            <button className="text-xs text-gray-500 hover:text-white px-2 py-0.5 rounded hover:bg-gray-800 transition">
              📂 切换
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-gray-700 rounded-xl p-1.5 shadow-xl hidden group-hover:block z-50 max-h-48 overflow-y-auto">
              {(allProjects || []).map((p: any) => (
                <a key={p.id} href={`/project/${p.id}`}
                  className={`block text-xs px-3 py-1.5 rounded-lg transition ${p.id === id ? "bg-purple-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
                  {p.title.slice(0, 24)}
                </a>
              ))}
            </div>
          </div>
        </div>
        <h2 className="text-base font-bold mb-1">{project.title}</h2>
        <p className="text-xs text-gray-500 mb-3">{project.genre} · {(volumes||[]).length}卷 · {(chapters||[]).length}章</p>
        {(volumes || []).map((vol: any) => {
          const vc = (chapters || []).filter((c: any) => c.volume_id === vol.id).sort((a: any, b: any) => a.sort_order - b.sort_order);
          return (
            <div key={vol.id} className="mb-2">
              <h3 className="text-xs font-bold text-purple-400 mb-1">{vol.title} ({vc.length})</h3>
              {vc.map((ch: any) => (
                <a key={ch.id} href={`/project/${id}?cid=${ch.id}`}
                  className="block w-full text-left text-xs px-2 py-1 rounded mb-0.5 text-gray-400 hover:bg-gray-800 hover:text-white transition">
                  {ch.sort_order}. {ch.title.split('\n')[0].slice(0, 28)}{ch.content && " ✓"}
                </a>
              ))}
            </div>
          );
        })}

        {/* 角色管理 */}
        <div className="mt-4 pt-3 border-t border-gray-800">
          <h3 className="text-xs font-bold text-pink-400 mb-2">🎭 角色 ({(characters||[]).length})</h3>
          {(characters || []).map((ch: any) => (
            <a key={ch.id} href={`/project/${id}?cid=${ch.id}&edit=char`}
              className="block text-xs px-2 py-1 text-gray-400 hover:text-white transition">{ch.name}</a>
          ))}
          <a href={`/project/${id}`} className="block text-xs px-2 py-1 mt-1 text-pink-500 hover:text-pink-400 transition">+ 添加角色</a>
        </div>
      </aside>

      <ChapterEditor projectId={id} project={project} chapters={chapters || []} characters={characters || []} />
    </main>
  );
}
