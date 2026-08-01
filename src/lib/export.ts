export type ExportFormat = "txt" | "markdown" | "publish";

interface ChapterData {
  title: string;
  content: string;
}

export const FORMAT_LABELS: Record<ExportFormat, string> = {
  txt: ".txt",
  markdown: ".md",
  publish: "发布版",
};

/** 清洗 AI 生成文本里常见的 Markdown 残留，网文平台不认这些符号 */
function stripMarkdown(text: string): string {
  return text
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")            // 标题 ###
    .replace(/^\s{0,3}>\s?/gm, "")                  // 引用 >
    .replace(/^\s{0,3}[-*+]\s+/gm, "")             // 无序列表
    .replace(/^\s{0,3}([-*_]\s*){3,}$/gm, "")      // 分隔线 ---
    // 先清粗体（双星），再清斜体（单星）；斜体用负向断言避免误删粗体的 *
    .replace(/\*\*(.+?)\*\*/g, "$1")                 // 加粗
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")    // 斜体（不吃双星）
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1");         // 代码标记
}

/**
 * 番茄/起点投稿排版：无 Markdown、段首两个全角空格、段间空行。
 * 复制或上传到平台编辑器即可直接发布。
 */
function fmtPublish(title: string, content: string): string {
  const body = stripMarkdown(content)
    .split("\n")
    .map((l) => l.replace(/^[\s　]+/, "").trimEnd())
    .filter((l) => l.length > 0)
    .map((l) => "　　" + l)
    .join("\n\n");
  return `${title}\n\n${body}`;
}

function fmtMD(title: string, content: string): string {
  return `# ${title}\n\n${content}`;
}

function fmtTXT(title: string, content: string): string {
  return `${title}\n${"-".repeat(20)}\n${content}`;
}

function formatOne(title: string, content: string, format: ExportFormat): string {
  if (format === "publish") return fmtPublish(title, content);
  if (format === "markdown") return fmtMD(title, content);
  return fmtTXT(title, content);
}

function extOf(format: ExportFormat): string {
  return format === "markdown" ? "md" : "txt";
}

export function exportSingleChapter(title: string, content: string, format: ExportFormat): void {
  const text = formatOne(title, content, format);
  const suffix = format === "publish" ? "_发布版" : "";
  download(text, `${title}${suffix}.${extOf(format)}`);
}

export function exportFullProject(projectTitle: string, chapters: ChapterData[], format: ExportFormat): void {
  // 发布版章节之间留两个空行，方便在平台编辑器里分章粘贴
  const sep = format === "publish" ? "\n\n\n" : "\n\n";
  const text = chapters.map((ch) => formatOne(ch.title, ch.content, format)).join(sep);
  const suffix = format === "publish" ? "_发布版" : "_全卷";
  download(text, `${projectTitle}${suffix}.${extOf(format)}`);
}

/** 复制单章发布版到剪贴板——手机端最常用的投稿路径 */
export async function copyPublishText(title: string, content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(fmtPublish(title, content));
    return true;
  } catch {
    return false;
  }
}

function download(text: string, filename: string): void {
  const b = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
