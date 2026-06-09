import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "行きたいところリスト",
  description: "行きたいご飯・外出先を保存して、予定管理や訪問記録までまとめるページ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
