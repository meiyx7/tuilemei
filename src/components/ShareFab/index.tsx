import { useState, useRef, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import type { ITouchEvent } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

interface ShareFabProps {
  onClick: () => void;
}

/**
 * 右下角浮动分享按钮(印章风格胶囊)。
 *
 * 交互:
 *  - 可拖动:onTouchStart/Move/End 记录位置,松手吸附到最近左/右边缘
 *  - 点击 vs 拖动:移动距离 < 4px 视为点击,触发 onClick
 *  - 自动半隐藏:静止 3 秒后向边缘方向多滑半个身位,透明度降低
 *  - 触摸即唤醒:恢复完整显示并重新计时
 *
 * 视觉:半透明朱砂红胶囊,"分享"二字横排白字阴文,印章风格内框。
 */
const FAB_W_RPX = 132;
const FAB_H_RPX = 76;
const EDGE_RPX = 24;
const HIDE_DELAY = 3000;

export default function ShareFab({ onClick }: ShareFabProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [hidden, setHidden] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [win, setWin] = useState({ w: 375, h: 667 });
  const dragRef = useRef({ startX: 0, startY: 0, originX: 0, originY: 0, moved: false });
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sys = Taro.getWindowInfo?.() || Taro.getSystemInfoSync();
    setWin({ w: sys.windowWidth, h: sys.windowHeight });
    scheduleHide();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  function scheduleHide() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHidden(true), HIDE_DELAY);
  }
  function wakeUp() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHidden(false);
  }

  // rpx -> px(按当前窗口宽度换算)
  const px = (rpx: number) => (rpx / 750) * win.w;
  const fabW = px(FAB_W_RPX);
  const fabH = px(FAB_H_RPX);
  const edge = px(EDGE_RPX);
  const initialX = win.w - fabW - edge;
  const initialY = win.h - fabH - px(140);
  const curX = pos?.x ?? initialX;
  const curY = pos?.y ?? initialY;
  const onLeft = curX + fabW / 2 < win.w / 2;
  const hiddenOffsetX = hidden ? (onLeft ? -fabW / 2 : fabW / 2) : 0;

  function onTouchStart(e: ITouchEvent) {
    const t = e.touches?.[0];
    if (!t) return;
    dragRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      originX: curX,
      originY: curY,
      moved: false,
    };
    setDragging(true);
    wakeUp();
  }

  function onTouchMove(e: ITouchEvent) {
    const t = e.touches?.[0];
    if (!t) return;
    const dx = t.clientX - dragRef.current.startX;
    const dy = t.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
    // 边界约束:左右各允许露出半个身位,上下不超出视口
    let nx = dragRef.current.originX + dx;
    let ny = dragRef.current.originY + dy;
    nx = Math.max(-fabW / 2, Math.min(win.w - fabW / 2, nx));
    ny = Math.max(0, Math.min(win.h - fabH, ny));
    setPos({ x: nx, y: ny });
  }

  function onTouchEnd() {
    setDragging(false);
    if (!dragRef.current.moved) {
      // 视为点击:打开分享,并重新安排隐藏
      onClick();
      scheduleHide();
      return;
    }
    // 拖动结束:吸附到最近左/右边缘
    const centerX = curX + fabW / 2;
    const snapX = centerX < win.w / 2 ? edge : win.w - fabW - edge;
    setPos({ x: snapX, y: curY });
    scheduleHide();
  }

  return (
    <View
      className={`share-fab ${hidden ? 'share-fab-hidden' : ''} ${dragging ? 'share-fab-dragging' : ''}`}
      style={{
        left: `${curX + hiddenOffsetX}px`,
        top: `${curY}px`,
        width: `${fabW}px`,
        height: `${fabH}px`,
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      catchMove
    >
      <View className="share-fab-inner">
        <Text className="share-fab-text">分享</Text>
      </View>
    </View>
  );
}
