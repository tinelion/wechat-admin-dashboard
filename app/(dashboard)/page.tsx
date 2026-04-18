'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, UserMinus, MessageSquare, TrendingUp } from 'lucide-react';

interface TodayStats {
  newFans: number;
  unfollowFans: number;
  totalFans: number;
  messageCount: number;
}

interface DailyStat {
  date: string;
  new_fans: number;
  unfollow_fans: number;
  total_fans: number;
  message_count: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [recent, setRecent] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data.today);
        setRecent(data.recent || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: '总粉丝数',
      value: stats?.totalFans || 0,
      icon: Users,
      description: '当前关注粉丝总数',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: '今日新增',
      value: stats?.newFans || 0,
      icon: UserPlus,
      description: '今日新关注粉丝',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: '今日取关',
      value: stats?.unfollowFans || 0,
      icon: UserMinus,
      description: '今日取消关注',
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: '今日消息',
      value: stats?.messageCount || 0,
      icon: MessageSquare,
      description: '今日收到消息数',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">数据概览</h1>
        <p className="text-muted-foreground">微信公众号运营数据一览</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            近期趋势
          </CardTitle>
          <CardDescription>最近 {recent.length} 天的粉丝和消息数据</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无数据，配置微信公众号并同步粉丝后将自动生成统计数据
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">日期</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">总粉丝</th>
                    <th className="text-right py-3 px-2 font-medium text-green-600">新增</th>
                    <th className="text-right py-3 px-2 font-medium text-red-600">取关</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">消息数</th>
                  </tr>
                </thead>
                <tbody>
                  {[...recent].reverse().slice(0, 14).map((stat) => (
                    <tr key={stat.date} className="border-b last:border-0">
                      <td className="py-2 px-2">{stat.date}</td>
                      <td className="text-right py-2 px-2 font-medium">{stat.total_fans}</td>
                      <td className="text-right py-2 px-2 text-green-600">+{stat.new_fans}</td>
                      <td className="text-right py-2 px-2 text-red-600">-{stat.unfollow_fans}</td>
                      <td className="text-right py-2 px-2">{stat.message_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
