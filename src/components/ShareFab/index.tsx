import { useState, useRef, useEffect } from 'react';
import { View } from '@tarojs/components';
import type { ITouchEvent } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

interface ShareFabProps {
  onClick: () => void;
}

/**
 * 右下角浮动分享按钮(印章风格圆形 + 分享图标)。
 *
 * 交互:
 *  - 可拖动:onTouchStart/Move/End 记录位置,松手吸附到最近左/右边缘
 *  - 点击 vs 拖动:移动距离 < 4px 视为点击,触发 onClick
 *  - 自动半隐藏:静止 3 秒后向边缘方向多滑半个身位,透明度降低
 *  - 触摸即唤醒:恢复完整显示并重新计时
 *
 * 视觉:半透明朱砂红圆形,内嵌分享图标(三节点连线式 SVG,白线阴文),
 * 印章风格双圈内框。一眼可辨是分享按钮。
 */
const FAB_SIZE_RPX = 96;
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
  const fabSize = px(FAB_SIZE_RPX);
  const edge = px(EDGE_RPX);
  const initialX = win.w - fabSize - edge;
  const initialY = win.h - fabSize - px(140);
  const curX = pos?.x ?? initialX;
  const curY = pos?.y ?? initialY;
  const onLeft = curX + fabSize / 2 < win.w / 2;
  const hiddenOffsetX = hidden ? (onLeft ? -fabSize / 2 : fabSize / 2) : 0;

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
    nx = Math.max(-fabSize / 2, Math.min(win.w - fabSize / 2, nx));
    ny = Math.max(0, Math.min(win.h - fabSize, ny));
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
    const centerX = curX + fabSize / 2;
    const snapX = centerX < win.w / 2 ? edge : win.w - fabSize - edge;
    setPos({ x: snapX, y: curY });
    scheduleHide();
  }

  return (
    <View
      className={`share-fab ${hidden ? 'share-fab-hidden' : ''} ${dragging ? 'share-fab-dragging' : ''}`}
      style={{
        left: `${curX + hiddenOffsetX}px`,
        top: `${curY}px`,
        width: `${fabSize}px`,
        height: `${fabSize}px`,
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      catchMove
    >
      <View className="share-fab-inner">
        {/* 系统默认分享图标:方框(底开口)+ 向上箭头(iOS/Android 通用样式) */}
        <View className="share-fab-icon">
          {/* 向上箭头:用边框拼三角形 */}
          <View className="share-fab-arrow" />
          {/* 箭杆 */}
          <View className="share-fab-arrow-stem" />
          {/* 方框:左右底三边(顶部开口让箭头穿过) */}
          <View className="share-fab-box" />
        </View>
      </View>
    </View>
  );
}
