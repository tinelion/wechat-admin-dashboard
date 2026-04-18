import './globals.css';

export const metadata = {
  title: '微信公众号管理后台',
  description: '基于 Next.js 的微信公众号管理后台系统'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen w-full flex-col">{children}</body>
    </html>
  );
}
