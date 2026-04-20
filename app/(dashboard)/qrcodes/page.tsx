'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Plus, RefreshCw, QrCode as QrCodeIcon } from 'lucide-react';
import { useAccount } from '../account-context';

interface QrCode {
  id: number;
  sceneStr: string;
  ticket: string;
  url: string;
  scanCount: number;
  isPermanent: boolean;
  expireTime: string | null;
  remark: string;
  createdAt: string;
}

export default function QrCodesPage() {
  const { currentAccountId } = useAccount();
  const [qrcodes, setQrcodes] = useState<QrCode[]>([]);
  const [loading, setLoading] = useState(true);

  // 创建二维码弹窗
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    sceneStr: '',
    remark: '',
    isPermanent: false,
  });

  const fetchQrCodes = useCallback(async () => {
    if (!currentAccountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/qrcodes?configId=${currentAccountId}`);
      const data = await res.json();
      setQrcodes(Array.isArray(data) ? data : (Array.isArray(data?.qrcodes) ? data.qrcodes : []));
    } catch (error) {
      console.error('Failed to fetch qrcodes:', error);
    } finally {
      setLoading(false);
    }
  }, [currentAccountId]);

  useEffect(() => {
    setQrcodes([]);
  }, [currentAccountId]);

  useEffect(() => {
    fetchQrCodes();
  }, [fetchQrCodes]);

  async function handleCreate() {
    if (!currentAccountId || !form.sceneStr) return;
    try {
      const res = await fetch('/api/qrcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, configId: currentAccountId }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setCreateOpen(false);
        setForm({ sceneStr: '', remark: '', isPermanent: false });
        fetchQrCodes();
      }
    } catch (error) {
      alert('创建失败');
    }
  }

  function getQrCodeUrl(ticket: string) {
    return `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(ticket)}`;
  }

  function isExpired(qr: QrCode) {
    if (qr.isPermanent) return false;
    if (!qr.expireTime) return false;
    return new Date(qr.expireTime) < new Date();
  }

  if (!currentAccountId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">请先选择公众号</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">二维码管理</h1>
          <p className="text-muted-foreground">管理公众号带参数二维码</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchQrCodes} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            创建二维码
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : qrcodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无二维码，点击"创建二维码"生成
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>预览</TableHead>
                  <TableHead>场景值</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>扫描次数</TableHead>
                  <TableHead>过期状态</TableHead>
                  <TableHead>创建时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qrcodes.map((qr) => (
                  <TableRow key={qr.id}>
                    <TableCell>
                      {qr.ticket ? (
                        <img
                          src={getQrCodeUrl(qr.ticket)}
                          alt="二维码"
                          className="w-12 h-12 rounded border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center">
                          <QrCodeIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{qr.sceneStr}</TableCell>
                    <TableCell className="text-muted-foreground">{qr.remark || '-'}</TableCell>
                    <TableCell>
                      {qr.isPermanent ? (
                        <Badge className="bg-green-600 hover:bg-green-700">永久</Badge>
                      ) : (
                        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">临时</Badge>
                      )}
                    </TableCell>
                    <TableCell>{qr.scanCount || 0}</TableCell>
                    <TableCell>
                      {qr.isPermanent ? (
                        <Badge variant="outline">永不过期</Badge>
                      ) : isExpired(qr) ? (
                        <Badge variant="destructive">已过期</Badge>
                      ) : (
                        <Badge variant="secondary">有效</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {qr.createdAt ? new Date(qr.createdAt).toLocaleString('zh-CN') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 创建二维码弹窗 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建二维码</DialogTitle>
            <DialogDescription>创建带参数的公众号二维码</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>场景值</Label>
              <Input
                placeholder="输入场景值（如：channel_001）"
                value={form.sceneStr}
                onChange={(e) => setForm({ ...form, sceneStr: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Input
                placeholder="输入备注信息（可选）"
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="permanent"
                checked={form.isPermanent}
                onChange={(e) => setForm({ ...form, isPermanent: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="permanent">永久二维码</Label>
            </div>
            {form.isPermanent && (
              <p className="text-xs text-muted-foreground">
                注意：永久二维码数量有限（最多10万个），请谨慎使用
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!form.sceneStr}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
