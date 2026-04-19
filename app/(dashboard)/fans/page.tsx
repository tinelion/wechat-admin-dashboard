'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, RefreshCw, Trash2 } from 'lucide-react';

interface Fan {
  id: number;
  openid: string;
  nickname: string | null;
  headimgurl: string | null;
  sex: number | null;
  city: string | null;
  province: string | null;
  country: string | null;
  subscribe: boolean;
  subscribeTime: string | null;
  subscribeScene: string | null;
  remark: string | null;
  createdAt: string;
}

// 个人订阅号没有高级API权限
function canSyncFans(accountType: string | undefined) {
  return accountType !== 'subscription' && accountType !== 'miniprogram';
}

export default function FansPage() {
  const [fans, setFans] = useState<Fan[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [accountType, setAccountType] = useState<string>('subscription');
  const limit = 20;

  // 获取公众号类型
  useEffect(() => {
    fetch('/api/wechat/config')
      .then(r => r.json())
      .then(data => {
        if (data.accountType) setAccountType(data.accountType);
      })
      .catch(() => {});
  }, []);

  const fetchFans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fans?search=${search}&offset=${offset}&limit=${limit}`);
      const data = await res.json();
      setFans(data.fans || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch fans:', error);
    } finally {
      setLoading(false);
    }
  }, [search, offset]);

  useEffect(() => {
    fetchFans();
  }, [fetchFans]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/fans/sync', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert(`同步完成！共 ${data.total} 个粉丝，新增 ${data.newFans} 个`);
        fetchFans();
      }
    } catch (error) {
      alert('同步失败，请检查微信公众号配置');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定要删除该粉丝记录吗？')) return;
    try {
      await fetch(`/api/fans?id=${id}`, { method: 'DELETE' });
      fetchFans();
    } catch (error) {
      console.error('Failed to delete fan:', error);
    }
  }

  function formatSubscribeTime(time: string | null) {
    if (!time) return '-';
    // 尝试 Unix 时间戳格式
    const ts = parseInt(time);
    if (!isNaN(ts) && ts > 1000000000) {
      const date = new Date(ts * 1000);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    }
    // ISO 格式
    return time;
  }

  const sexMap: Record<number, string> = { 0: '未知', 1: '男', 2: '女' };
  const showSync = canSyncFans(accountType);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">粉丝管理</h1>
          <p className="text-muted-foreground">
            共 {total} 个粉丝
            {!showSync && (
              <span className="ml-2 text-xs">（通过关注事件自动积累）</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showSync && (
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? '同步中...' : '从微信同步'}
            </Button>
          )}
          <Button variant="outline" onClick={fetchFans} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索昵称、OpenID、城市..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : fans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? '未找到匹配的粉丝' : (
                showSync
                  ? '暂无粉丝数据，点击"从微信同步"获取粉丝列表'
                  : '暂无粉丝数据，用户关注公众号后将自动记录'
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">头像</TableHead>
                    <TableHead>昵称</TableHead>
                    <TableHead>性别</TableHead>
                    <TableHead className="hidden md:table-cell">地区</TableHead>
                    <TableHead>关注时间</TableHead>
                    <TableHead className="hidden lg:table-cell">关注场景</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fans.map((fan) => (
                    <TableRow key={fan.id}>
                      <TableCell>
                        {fan.headimgurl ? (
                          <img src={fan.headimgurl} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">
                            {fan.nickname?.[0] || '?'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {fan.nickname || fan.openid.slice(0, 8) + '...'}
                      </TableCell>
                      <TableCell>{sexMap[fan.sex || 0]}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {[fan.province, fan.city].filter(Boolean).join(' ') || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatSubscribeTime(fan.subscribeTime)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {fan.subscribeScene || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={fan.subscribe ? 'default' : 'secondary'}>
                          {fan.subscribe ? '已关注' : '已取关'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(fan.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  显示 {offset + 1}-{Math.min(offset + limit, total)} / 共 {total} 条
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    disabled={offset + limit >= total}
                    onClick={() => setOffset(offset + limit)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
