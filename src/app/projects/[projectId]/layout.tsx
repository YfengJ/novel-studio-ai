import Link from "next/link";
import { BookOpen, Boxes, Database, FileJson, GitFork, Home, PenLine, Settings, ShieldCheck, Users } from "lucide-react";

const nav = [
  { href: "", label: "Dashboard", icon: Home },
  { href: "settings", label: "设置", icon: Settings },
  { href: "story-bible", label: "Story Bible", icon: BookOpen },
  { href: "style-bible", label: "Style Bible", icon: PenLine },
  { href: "outline", label: "大纲", icon: Boxes },
  { href: "characters", label: "角色", icon: Users },
  { href: "graph", label: "图谱", icon: GitFork },
  { href: "studio", label: "Chapter Studio", icon: FileJson },
  { href: "memory", label: "记忆检索", icon: Database }
];

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-line bg-[#fbfcfa] p-5 lg:block">
        <Link href="/" className="text-sm font-semibold text-accent hover:underline">← 项目列表</Link>
        <div className="mt-6 rounded-lg border border-line bg-ink p-4 text-white">
          <div className="text-xs uppercase tracking-[0.22em] text-white/45">Novel Studio</div>
          <div className="mt-2 text-lg font-semibold">长篇创作工作台</div>
          <p className="mt-2 text-xs leading-5 text-white/65">设定、大纲、正文、检查和记忆入库分步执行。</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-white/70">
            <ShieldCheck size={13} /> local SQLite
          </div>
        </div>
        <nav className="mt-5 grid gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href || "dashboard"} href={`/projects/${projectId}/${item.href}`} className="flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-sm text-ink/80 hover:border-line hover:bg-white hover:text-ink">
                <Icon size={16} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-line bg-white p-3 text-xs leading-5 text-ink/60">
          记忆只在“接受章节”后入库，下一章写作会重新组装 Context Pack。
        </div>
      </aside>
      <div className="lg:pl-72">
        <div className="border-b border-line bg-white px-4 py-3 lg:hidden">
          <Link href="/" className="text-sm font-semibold text-accent">← 项目列表</Link>
        </div>
        {children}
      </div>
    </div>
  );
}
