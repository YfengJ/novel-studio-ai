import type { Metadata } from "next";
import { OperationCenter } from "@/components/client/OperationCenter";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 长篇小说创作工作台",
  description: "本地优先的长篇小说设定、大纲、记忆和章节创作系统"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <OperationCenter />
      </body>
    </html>
  );
}
