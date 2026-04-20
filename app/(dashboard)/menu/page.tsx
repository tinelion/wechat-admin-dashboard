'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Trash2, Save, Upload, ChevronDown, ChevronRight, ExternalLink,
} from 'lucide-react';
import { useAccount } from '../account-context';

interface MenuItem {
  name: string;
  type?: string;
  key?: string;
  url?: string;
  appid?: string;
  pagepath?: string;
  media_id?: string;
  sub_button?: MenuItem[];
}

interface MenuData {
  id?: number;
  name?: string;
  config: { button: MenuItem[] };
  isPublished: boolean;
  publishedAt?: string;
}

const defaultMenu: MenuItem[] = [
  { name: '菜单1', sub_button: [] },
  { name: '菜单2', sub_button: [] },
  { name: '菜单3', sub_button: [] },
];

const typeOptions = [
  { value: 'click', label: '点击推事件' },
  { value: 'view', label: '跳转网页' },
  { value: 'miniprogram', label: '跳转小程序' },
  { value: 'media_id', label: '发送图片' },
  { value: 'view_limited', label: '跳转图文' },
];

export default function MenuPage() {
  const { currentAccountId } = useAccount();
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [buttons, setButtons] = useState<MenuItem[]>(defaultMenu);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const fetchMenu = useCallback(async () => {
    if (!currentAccountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/menu?configId=${currentAccountId}`);
      const data = await res.json();
      if (data && typeof data === 'object' && !data.error) {
        setMenuData(data);
        if (data.config?.button) {
          setButtons(data.config.button);
        }
      }
    } catch (error) {
      console.error('Failed to fetch menu:', error);
    } finally {
      setLoading(false);
    }
  }, [currentAccountId]);

  useEffect(() => {
    setMenuData(null);
    setButtons(defaultMenu);
    setExpandedIndex(null);
  }, [currentAccountId]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  function updateButton(index: number, field: string, value: any) {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    // If setting a type and has sub_buttons, clear sub_buttons
    if (field === 'type' && value && newButtons[index].sub_button?.length) {
      newButtons[index].sub_button = [];
    }
    setButtons(newButtons);
  }

  function updateSubButton(parentIndex: number, childIndex: number, field: string, value: any) {
    const newButtons = [...buttons];
    const subs = [...(newButtons[parentIndex].sub_button || [])];
    subs[childIndex] = { ...subs[childIndex], [field]: value };
    newButtons[parentIndex] = { ...newButtons[parentIndex], sub_button: subs };
    setButtons(newButtons);
  }

  function addSubButton(parentIndex: number) {
    const newButtons = [...buttons];
    const subs = [...(newButtons[parentIndex].sub_button || [])];
    if (subs.length >= 5) {
      alert('每个一级菜单最多5个二级菜单');
      return;
    }
    subs.push({ name: '子菜单' });
    newButtons[parentIndex] = { ...newButtons[parentIndex], sub_button: subs, type: undefined };
    setButtons(newButtons);
  }

  function removeSubButton(parentIndex: number, childIndex: number) {
    const newButtons = [...buttons];
    const subs = [...(newButtons[parentIndex].sub_button || [])];
    subs.splice(childIndex, 1);
    newButtons[parentIndex] = { ...newButtons[parentIndex], sub_button: subs };
    setButtons(newButtons);
  }

  async function handleSave() {
    if (!currentAccountId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { button: buttons }, action: 'save', configId: currentAccountId }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert('菜单已保存');
        fetchMenu();
      }
    } catch {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!currentAccountId) return;
    if (!confirm('确定要发布菜单到微信吗？这将替换当前微信上的菜单。')) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { button: buttons }, action: 'publish', configId: currentAccountId }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert('菜单已成功发布到微信！');
        fetchMenu();
      }
    } catch {
      alert('发布失败，请检查微信公众号配置');
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    if (!currentAccountId) return;
    if (!confirm('确定要删除微信上的菜单吗？')) return;
    try {
      const res = await fetch(`/api/menu?configId=${currentAccountId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert('菜单已从微信删除');
        fetchMenu();
      }
    } catch {
      alert('删除失败');
    }
  }

  function renderMenuItem(item: MenuItem, index: number, isSub: boolean = false) {
    const hasSub = item.sub_button && item.sub_button.length > 0;
    const showType = !hasSub && item.type;

    return (
      <div key={index} className="border rounded-lg p-3 space-y-2 bg-card">
        <div className="flex items-center gap-2">
          <Input
            className="flex-1 h-8 text-sm font-medium"
            value={item.name}
            onChange={(e) => isSub
              ? updateSubButton(expandedIndex!, index, 'name', e.target.value)
              : updateButton(index, 'name', e.target.value)
            }
            placeholder="菜单名称"
            maxLength={isSub ? 7 : 4}
          />
          {isSub && (
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => removeSubButton(expandedIndex!, index)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>

        {!isSub && (
          <div className="flex items-center gap-2">
            <Button
              variant={hasSub ? 'secondary' : 'outline'}
              size="sm"
              className="text-xs"
              onClick={() => {
                if (hasSub) {
                  setExpandedIndex(expandedIndex === index ? null : index);
                } else {
                  setExpandedIndex(index);
                }
              }}
            >
              {expandedIndex === index ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
              子菜单 ({item.sub_button?.length || 0}/5)
            </Button>
            {!hasSub && (
              <Button variant="outline" size="sm" className="text-xs"
                onClick={() => addSubButton(index)}>
                <Plus className="h-3 w-3 mr-1" /> 添加子菜单
              </Button>
            )}
          </div>
        )}

        {/* Sub buttons */}
        {!isSub && expandedIndex === index && item.sub_button?.map((sub, subIndex) => (
          <div key={subIndex} className="ml-4 border-l-2 pl-3">
            {renderMenuItem(sub, subIndex, true)}
          </div>
        ))}

        {/* Type selector (only for items without sub buttons) */}
        {!hasSub && !isSub && (
          <div className="space-y-2 pt-1">
            <select
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={item.type || ''}
              onChange={(e) => updateButton(index, 'type', e.target.value || undefined)}
            >
              <option value="">不设置（仅作分类）</option>
              {typeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {item.type === 'click' && (
              <Input
                className="h-8 text-sm"
                placeholder="事件Key（用于后端处理）"
                value={item.key || ''}
                onChange={(e) => updateButton(index, 'key', e.target.value)}
              />
            )}

            {item.type === 'view' && (
              <Input
                className="h-8 text-sm"
                placeholder="网页URL"
                value={item.url || ''}
                onChange={(e) => updateButton(index, 'url', e.target.value)}
              />
            )}

            {item.type === 'miniprogram' && (
              <>
                <Input
                  className="h-8 text-sm"
                  placeholder="小程序AppID"
                  value={item.appid || ''}
                  onChange={(e) => updateButton(index, 'appid', e.target.value)}
                />
                <Input
                  className="h-8 text-sm"
                  placeholder="小程序页面路径"
                  value={item.pagepath || ''}
                  onChange={(e) => updateButton(index, 'pagepath', e.target.value)}
                />
                <Input
                  className="h-8 text-sm"
                  placeholder="备用网页URL"
                  value={item.url || ''}
                  onChange={(e) => updateButton(index, 'url', e.target.value)}
                />
              </>
            )}

            {item.type === 'media_id' && (
              <Input
                className="h-8 text-sm"
                placeholder="素材MediaID"
                value={item.media_id || ''}
                onChange={(e) => updateButton(index, 'media_id', e.target.value)}
              />
            )}
          </div>
        )}

        {/* Sub item type config */}
        {isSub && !hasSub && (
          <div className="space-y-2 pt-1">
            <select
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={item.type || ''}
              onChange={(e) => updateSubButton(expandedIndex!, index, 'type', e.target.value || undefined)}
            >
              <option value="">不设置</option>
              {typeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {item.type === 'click' && (
              <Input className="h-8 text-sm" placeholder="事件Key"
                value={item.key || ''}
                onChange={(e) => updateSubButton(expandedIndex!, index, 'key', e.target.value)} />
            )}
            {item.type === 'view' && (
              <Input className="h-8 text-sm" placeholder="网页URL"
                value={item.url || ''}
                onChange={(e) => updateSubButton(expandedIndex!, index, 'url', e.target.value)} />
            )}
            {item.type === 'miniprogram' && (
              <>
                <Input className="h-8 text-sm" placeholder="小程序AppID"
                  value={item.appid || ''}
                  onChange={(e) => updateSubButton(expandedIndex!, index, 'appid', e.target.value)} />
                <Input className="h-8 text-sm" placeholder="小程序页面路径"
                  value={item.pagepath || ''}
                  onChange={(e) => updateSubButton(expandedIndex!, index, 'pagepath', e.target.value)} />
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!currentAccountId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">请先选择公众号</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">菜单管理</h1>
          <p className="text-muted-foreground">
            配置公众号底部菜单（最多3个一级菜单，每个最多5个子菜单）
          </p>
        </div>
        <div className="flex gap-2">
          {menuData?.isPublished && (
            <Button variant="outline" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              删除微信菜单
            </Button>
          )}
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? '保存中...' : '保存草稿'}
          </Button>
          <Button onClick={handlePublish} disabled={publishing}>
            <Upload className="h-4 w-4 mr-2" />
            {publishing ? '发布中...' : '发布到微信'}
          </Button>
        </div>
      </div>

      {menuData?.isPublished && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-700">
          <Badge variant="default" className="bg-green-600">已发布</Badge>
          最后发布时间: {menuData.publishedAt || '-'}
        </div>
      )}

      {/* Menu Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">菜单编辑器</CardTitle>
          <CardDescription>
            一级菜单名称最多4个汉字，二级菜单最多7个汉字。有子菜单的一级菜单不能设置点击事件。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {buttons.map((btn, index) => (
              <div key={index}>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  一级菜单 {index + 1}
                </div>
                {renderMenuItem(btn, index)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Phone Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">手机预览</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <div className="w-[280px] border-2 border-gray-300 rounded-3xl overflow-hidden bg-white shadow-lg">
            {/* Status bar */}
            <div className="bg-gray-100 h-6 flex items-center justify-center text-xs text-gray-500">
              微信公众号
            </div>
            {/* Content area */}
            <div className="h-[300px] bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
              聊天界面
            </div>
            {/* Bottom menu */}
            <div className="border-t bg-white">
              <div className="flex">
                {buttons.map((btn, index) => (
                  <div key={index} className="flex-1 text-center border-r last:border-r-0">
                    {btn.sub_button && btn.sub_button.length > 0 ? (
                      <div className="py-2">
                        <span className="text-xs font-medium">{btn.name}</span>
                        <ChevronDown className="h-3 w-3 mx-auto text-gray-400" />
                      </div>
                    ) : (
                      <div className="py-2">
                        <span className="text-xs">{btn.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
