"use client";

import { useState, type ReactNode } from "react";

/**
 * 侧边栏外壳：桌面端常驻左侧，移动端收成抽屉。
 * 手机上写作区寸土寸金，目录默认收起，点「☰ 目录」滑出。
 */
export function SidebarShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 移动端悬浮开关 */}
      <button
        onClick={() => setOpen(true)}
        aria-label="打开章节目录"
        className="md:hidden fixed top-2.5 left-2.5 z-30 px-3 py-1.5 bg-gray-900/90 border border-gray-700 rounded-lg text-xs text-gray-300 backdrop-blur hover:text-white transition"
      >
        ☰ 目录
      </button>

      {/* 移动端遮罩 */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 z-40"
        />
      )}

      <aside
        className={`bg-gray-950 border-r border-gray-800 overflow-y-auto p-3 flex-shrink-0 w-64 h-screen
          fixed md:static inset-y-0 left-0 z-50
          transition-transform duration-200 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="md:hidden flex justify-end mb-1">
          <button
            onClick={() => setOpen(false)}
            aria-label="关闭目录"
            className="text-gray-500 hover:text-white text-sm px-2"
          >
            ✕
          </button>
        </div>
        {children}
      </aside>
    </>
  );
}
