'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  MessageSquare,
  Users,
  Settings,
  PanelLeft,
  Menu,
  Reply,
  ChevronDown,
  Mail,
  Megaphone,
  Image,
  QrCode,
  Tag,
} from 'lucide-react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import Providers from './providers';
import { AccountProvider, useAccount } from './account-context';
import { NavItem } from './nav-item';
import { User } from './user';

const navItems = [
  { href: '/', label: '数据概览', icon: Home },
  { href: '/fans', label: '粉丝管理', icon: Users },
  { href: '/messages', label: '消息管理', icon: MessageSquare },
  { href: '/auto-reply', label: '自动回复', icon: Reply },
  { href: '/menu', label: '菜单管理', icon: Menu },
  { href: '/templates', label: '模板消息', icon: Mail },
  { href: '/mass', label: '群发消息', icon: Megaphone },
  { href: '/material', label: '素材管理', icon: Image },
  { href: '/qrcodes', label: '二维码', icon: QrCode },
  { href: '/tags', label: '粉丝标签', icon: Tag },
  { href: '/settings', label: '系统设置', icon: Settings },
];

function AccountSwitcher() {
  const { accounts, currentAccount, currentAccountId, switchAccount, loading } = useAccount();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground">
        加载中...
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <Link href="/settings">
        <Badge variant="outline" className="text-orange-600 border-orange-300 cursor-pointer hover:bg-orange-50">
          请先配置公众号
        </Badge>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 h-9 px-3 max-w-[200px]">
          <span className="truncate text-sm">{currentAccount?.name || '选择公众号'}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        {accounts.map((account) => (
          <DropdownMenuItem
            key={account.id}
            onClick={() => switchAccount(account.id)}
            className={currentAccountId === account.id ? 'bg-accent' : ''}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="truncate">{account.name}</span>
              {currentAccountId === account.id && (
                <Badge variant="default" className="ml-auto shrink-0 text-xs px-1.5 py-0">
                  当前
                </Badge>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <AccountProvider>
        <main className="flex min-h-screen w-full flex-col bg-muted/40">
          <DesktopNav />
          <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
              <MobileNav />
              <DashboardBreadcrumb />
              <div className="flex-1" />
              <AccountSwitcher />
              <User />
            </header>
            <main className="grid flex-1 items-start gap-2 p-4 sm:px-6 sm:py-0 md:gap-4 bg-muted/40">
              {children}
            </main>
          </div>
        </main>
      </AccountProvider>
    </Providers>
  );
}

function DesktopNav() {
  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <Link
          href="/"
          className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
        >
          <span className="text-xs font-bold">微</span>
          <span className="sr-only">微信公众号管理</span>
        </Link>

        {navItems.map((item) => (
          <NavItem key={item.href} href={item.href} label={item.label}>
            <item.icon className="h-5 w-5" />
          </NavItem>
        ))}
      </nav>
    </aside>
  );
}

function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" className="sm:hidden">
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">菜单</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="sm:max-w-xs">
        <nav className="grid gap-6 text-lg font-medium">
          <Link
            href="/"
            className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
          >
            <span className="text-xs font-bold">微</span>
          </Link>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function DashboardBreadcrumb() {
  const pathname = usePathname();

  // Map pathname to breadcrumb label
  const currentNav = navItems.find(item => item.href === pathname);
  const currentPageLabel = currentNav?.label || '微信公众号管理后台';

  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">首页</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{currentPageLabel}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
