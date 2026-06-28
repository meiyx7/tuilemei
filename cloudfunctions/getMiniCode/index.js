// 退了没 —— 云函数：生成小程序码
//
// 用途：分享卡片右下角展示小程序码，用户长按或扫码可进入小程序。
// 接口：wx.openapi.wxacode.getUnlimited（云开发环境内置，无需手动获取 access_token）
//
// 调用方式：wx.cloud.callFunction({ name: 'getMiniCode' })
// 返回：{ fileID: 'cloud://...' } —— 上传到云存储后的文件 ID，客户端可直接用

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  // scene 最大 32 字符，这里用固定标识即可（页面路径由 page 参数控制）
  const { scene = 'share' } = event;
  try {
    const res = await cloud.openapi.wxacode.getUnlimited({
      scene: String(scene).slice(0, 32),
      page: 'pages/dashboard/index',  // 扫码后进入的页面
      checkPath: false,               // 跳过页面存在性校验（体验版/线上版页面可能未发布）
      envVersion: 'release',          // 线上版小程序码（避免扫到体验版）
      width: 280,                     // 小程序码尺寸（px）
      autoColor: false,
      lineColor: { r: 178, g: 58, b: 46 },  // 印章红 #b23a2e，与品牌色一致
      isHyaline: false,
    });

    if (res.errcode) {
      return { errcode: res.errcode, errmsg: res.errmsg };
    }

    // 把 Buffer 上传到云存储，返回 fileID 供客户端复用（避免每次都重新生成）
    const cloudPath = `minicode/${scene}_${Date.now()}.png`;
    const upload = await cloud.uploadFile({
      cloudPath,
      fileContent: res.buffer,
    });
    return { fileID: upload.fileID };
  } catch (e) {
    return { errcode: -1, errmsg: String(e && e.message || e) };
  }
};
