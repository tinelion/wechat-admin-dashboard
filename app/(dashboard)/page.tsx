'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, MessageSquare, TrendingUp, Hash } from 'lucide-react';
import { useAccount } from './account-context';

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

interface MessageDailyStat {
  date: string;
  count: number;
}

interface RecentMessage {
  id: number;
  openid: string;
  content: string;
  msgType: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { currentAccount, currentAccountId } = useAccount();
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [recent, setRecent] = useState<DailyStat[]>([]);
  const [daily, setDaily] = useState<MessageDailyStat[]>([]);
  const [topKeywords, setTopKeywords] = useState<{ keyword: string; count: number }[]>([]);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentAccountId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    Promise.all([
      fetch(`/api/stats?configId=${currentAccountId}`).then(res => res.json()),
      fetch(`/api/messages?configId=${currentAccountId}&limit=5`).then(res => res.json()),
    ])
      .then(([statsData, messagesData]) => {
        setStats(statsData.today);
        setRecent(statsData.recent || []);
        setDaily(statsData.daily || []);
        setTopKeywords(statsData.topKeywords || []);
        setRecentMessages(Array.isArray(messagesData) ? messagesData : (messagesData.messages || []));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentAccountId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!currentAccountId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="text-4xl font-bold text-primary">微</div>
          <h1 className="text-2xl font-bold tracking-tight">欢迎使用微信公众号管理后台</h1>
          <p className="text-muted-foreground max-w-md">
            请先在「系统设置」中配置公众号，然后在顶部导航栏选择要管理的公众号。
          </p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: '粉丝总数',
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
      title: '消息总数',
      value: daily.reduce((sum, d) => sum + d.count, 0),
      icon: MessageSquare,
      description: '近7天消息总量',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: '今日消息',
      value: stats?.messageCount || 0,
      icon: TrendingUp,
      description: '今日收到消息数',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  // Last 7 days for bar chart
  const last7Days = daily.slice(-7);
  const maxCount = Math.max(...last7Days.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">数据概览</h1>
        <p className="text-muted-foreground">
          {currentAccount?.name || '微信公众号'}运营数据一览
        </p>
      </div>

      {/* Stats Cards */}
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

      {/* Message Trend Bar Chart + Top Keywords */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              消息趋势
            </CardTitle>
            <CardDescription>最近 7 天消息量</CardDescription>
          </CardHeader>
          <CardContent>
            {last7Days.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                暂无数据
              </div>
            ) : (
              <div className="flex items-end gap-2 h-40">
                {last7Days.map((d) => {
                  const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-muted-foreground font-medium">
                        {d.count}
                      </span>
                      <div className="w-full flex items-end" style={{ height: '100px' }}>
                        <div
                          className="w-full bg-primary/80 rounded-t-sm transition-all duration-300 hover:bg-primary"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {d.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Keywords */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              高频关键词
            </CardTitle>
            <CardDescription>最近 7 天用户消息中的高频词</CardDescription>
          </CardHeader>
          <CardContent>
            {topKeywords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                暂无数据
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topKeywords.slice(0, 15).map((kw) => (
                  <Badge
                    key={kw.keyword}
                    variant="secondary"
                    className="text-sm py-1 px-3"
                  >
                    {kw.keyword}
                    <span className="ml-1.5 text-muted-foreground text-xs">
                      {kw.count}
                    </span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            最近消息
          </CardTitle>
          <CardDescription>最新 5 条用户消息</CardDescription>
        </CardHeader>
        <CardContent>
          {recentMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              暂无消息
            </div>
          ) : (
            <div className="space-y-3">
              {recentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-muted-foreground">
                        {msg.openid.slice(0, 8)}...
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString('zh-CN') : ''}
                      </span>
                    </div>
                    <p className="text-sm truncate">{msg.content || '[非文本消息]'}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {msg.msgType || 'text'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Trend Table */}
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
