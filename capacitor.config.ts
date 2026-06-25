import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tuilemei.app",
  appName: "退了没",
  webDir: "dist",
  // 让 webview 背景与年鉴体暖纸色一致，避免启动闪白
  backgroundColor: "#f4efe3",
  server: {
    androidScheme: "https",
    // allowMixedContent 属于 server 节点（参见 Capacitor 官方文档）
    allowMixedContent: false,
  },
  android: {
    // 允许 webview 使用 localStorage（默认即支持，显式声明）
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#f4efe3",
  },
};

export default config;
