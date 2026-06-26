import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { cn } from '@/lib/utils';
import './index.scss';

type TabKey = 'dashboard' | 'calc' | 'history';

interface TopTabProps {
  current: TabKey;
  /** 右侧额外按钮区域（设置/分享等） */
  extra?: React.ReactNode;
}

const TABS: { key: TabKey; text: string; path: string }[] = [
  { key: 'dashboard', text: '仪表盘', path: '/pages/dashboard/index' },
  { key: 'calc', text: '退休账本', path: '/pages/calc/index' },
  { key: 'history', text: '打卡历史', path: '/pages/history/index' },
];

/**
 * 顶部 Tab 导航：替代原生底部 tabBar。
 * 微信小程序原生 tabBar 只能在底部，为与 App 体验一致改用顶部自定义导航。
 * 因移除了原生 tabBar，页面切换使用 reLaunch（重载目标页，清空页面栈）。
 * extra 插槽用于在 tab 右侧放置操作按钮（设置/分享等），避免单独一行浪费空间。
 */
export default function TopTab({ current, extra }: TopTabProps) {
  const handleSwitch = (path: string) => {
    const router = Taro.getCurrentInstance().router;
    if (router && `/${router.path}` === path) return;
    Taro.reLaunch({ url: path });
  };

  return (
    <View className="toptab">
      <View className="toptab-tabs">
        {TABS.map((tab) => (
          <View
            key={tab.key}
            className={cn('toptab-item', current === tab.key && 'toptab-item--active')}
            onClick={() => handleSwitch(tab.path)}
          >
            <Text>{tab.text}</Text>
          </View>
        ))}
      </View>
      {extra && <View className="toptab-extra">{extra}</View>}
    </View>
  );
}
