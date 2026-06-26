import { View, Text, ScrollView } from '@tarojs/components';
import { APP_VERSION } from '@/lib/updater';
import type { UpdateInfo } from '@/lib/updater';
import './index.scss';

interface UpdateModalProps {
  open: boolean;
  onClose: () => void;
  info: UpdateInfo | null;
}

/**
 * 更新提示弹框（小程序简化版）。
 * 小程序的应用内更新由 wx.getUpdateManager 在 app.ts 中统一处理，
 * 此组件仅作为可选的版本信息展示，默认不会被调用。
 */
export default function UpdateModal({ open, onClose, info }: UpdateModalProps) {
  if (!open || !info) return null;

  const stopClose = (e: any) => {
    e.stopPropagation();
  };

  return (
    <View catchMove className="um-overlay" onClick={onClose}>
      <View className="um-card" onClick={stopClose}>
        <View className="um-close" onClick={onClose}>
          <Text>×</Text>
        </View>

        <View className="um-header">
          <Text className="eyebrow">应用更新 · Update</Text>
          <View className="um-title-row">
            <Text className="um-spark">✦</Text>
            <Text className="um-title">
              {info.hasUpdate ? '发现新版本' : '已是最新版本'}
            </Text>
          </View>
          <Text className="um-version">
            <Text className="num um-version-strong">v{info.version}</Text>
            <Text className="um-version-sep"> · </Text>
            当前 v{APP_VERSION}
          </Text>
        </View>

        {info.note ? (
          <ScrollView scrollY className="um-notes">
            <Text className="um-notes-text">{info.note}</Text>
          </ScrollView>
        ) : null}

        <View className="um-actions">
          <View className="btn btn-stamp" onClick={onClose}>
            <Text>{info.hasUpdate ? '知道了' : '好的'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
