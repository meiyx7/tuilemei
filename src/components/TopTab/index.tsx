import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { cn } from '@/lib/utils';
import './index.scss';

interface TopTabProps {
  /** 当前页面路径，用于高亮当前 tab */
  current: 'dashboard' | 'calc' | 'history';
}

const TABS = [
  { key: 'dashboard', text: '仪表盘', path: '/pages/dashboard/index' },
  { key: 'calc', text: '退休账本', path: '/pages/calc/index' },
  { key: 'history', text: '打卡历史', path: '/pages/history/index' },
] as const;

/**
 * 顶部 Tab 导航：替代原生底部 tabBar。
 * 微信小程序原生 tabBar 只能在底部，为与 App 体验一致改用顶部自定义导航。
 * 因移除了原生 tabBar，页面切换使用 reLaunch（重载目标页，清空页面栈）。
 */
export default function TopTab({ current }: TopTabProps) {
  const handleSwitch = (path: string) => {
    if (path === Taro.getCurrentInstance().router?.path) return;
    Taro.reLaunch({ url: path });
  };

  return (
    <View className="toptab">
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
  );
}
