'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Upload, Trash2, RefreshCw, FileText, Music, Video, Image } from 'lucide-react';
import { useAccount } from '../account-context';

interface Material {
  id: number;
  mediaId: string;
  name: string;
  type: string;
  url: string;
  updatedAt: string;
}

const typeConfig: Record<string, { label: string; icon: React.ElementType }> = {
  image: { label: '图片', icon: Image },
  voice: { label: '语音', icon: Music },
  video: { label: '视频', icon: Video },
  news: { label: '图文', icon: FileText },
};

export default function MaterialPage() {
  const { currentAccountId } = useAccount();
  const [activeTab, setActiveTab] = useState('image');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 删除确认弹窗
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);

  const fetchMaterials = useCallback(async () => {
    if (!currentAccountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/material?type=${activeTab}&configId=${currentAccountId}`);
      const data = await res.json();
      setMaterials(Array.isArray(data) ? data : (Array.isArray(data?.materials) ? data.materials : []));
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    } finally {
      setLoading(false);
    }
  }, [currentAccountId, activeTab]);

  useEffect(() => {
    setMaterials([]);
  }, [currentAccountId]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentAccountId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', activeTab);
      formData.append('configId', String(currentAccountId));

      const res = await fetch('/api/material', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        fetchMaterials();
      }
    } catch (error) {
      alert('上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleDelete() {
    if (!currentAccountId || !deleteTarget) return;
    try {
      const res = await fetch(`/api/material?mediaId=${deleteTarget.mediaId}&configId=${currentAccountId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setDeleteOpen(false);
        setDeleteTarget(null);
        fetchMaterials();
      }
    } catch (error) {
      alert('删除失败');
    }
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
          <h1 className="text-2xl font-bold tracking-tight">素材管理</h1>
          <p className="text-muted-foreground">管理公众号素材库</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchMaterials} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? '上传中...' : '上传素材'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={activeTab === 'image' ? 'image/*' : activeTab === 'voice' ? 'audio/*' : activeTab === 'video' ? 'video/*' : '*'}
            onChange={handleUpload}
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              {Object.entries(typeConfig).map(([key, config]) => (
                <TabsTrigger key={key} value={key}>
                  {config.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(typeConfig).map(([key]) => (
              <TabsContent key={key} value={key}>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">加载中...</div>
                ) : materials.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无{typeConfig[key].label}素材，点击"上传素材"添加
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
                    {materials.map((material) => (
                      <div
                        key={material.id}
                        className="group relative border rounded-lg overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="aspect-square flex items-center justify-center p-4">
                          {key === 'image' && material.url ? (
                            <img
                              src={material.url}
                              alt={material.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              {(() => {
                                const Icon = typeConfig[key]?.icon || FileText;
                                return <Icon className="h-12 w-12" />;
                              })()}
                              <span className="text-xs text-center truncate w-full">
                                {material.name || material.mediaId.slice(0, 12) + '...'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="px-3 py-2 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {material.name || '-'}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setDeleteTarget(material);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除素材 "{deleteTarget?.name || deleteTarget?.mediaId}" 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
