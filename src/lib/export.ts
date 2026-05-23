export type ExportFormat = "txt" | "markdown";

interface ChapterData {
  title: string;
  content: string;
}

function fmtMD(title: string, content: string): string {
  return `# ${title}\n\n${content}`;
}

function fmtTXT(title: string, content: string): string {
  return `${title}\n${"-".repeat(20)}\n${content}`;
}

function fmtTomato(lines: ChapterData[], format: ExportFormat): string {
  return lines.map((ch, i) => {
    const body = format === "markdown" ? fmtMD(ch.title, ch.content) : fmtTXT(ch.title, ch.content);
    return (i > 0 ? "\n\n" : "") + body;
  }).join("");
}

export function exportSingleChapter(title: string, content: string, format: ExportFormat): void {
  const header = format === "markdown" ? `# ${title}` : `${title}\n${"-".repeat(20)}`;
  const text = format === "markdown" ? fmtMD(title, content) : fmtTXT(title, content);
  const ext = format === "markdown" ? "md" : "txt";
  download(text, `${title}.${ext}`);
}

export function exportFullProject(projectTitle: string, chapters: ChapterData[], format: ExportFormat): void {
  const text = fmtTomato(chapters, format);
  const ext = format === "markdown" ? "md" : "txt";
  download(text, `${projectTitle}_全卷.${ext}`);
}

function download(text: string, filename: string): void {
  const b = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
