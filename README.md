# 北京时间时间码（手机网页版）

打开 `index.html` 即可使用。页面会以 `assets/3374.jpg` 为默认底图，并覆盖两处同源的 `Asia/Shanghai` 北京时间。

> 当前工作区和所附对话均未提供原始 `3374.jpg` 文件。请把文件放到 `assets/3374.jpg`，或在网页设置中上传；上传后的图片会保存到本机浏览器。

时间首先向两个独立的 HTTP 时间服务请求校准；仅在请求成功时显示“已网络校准”。失败时会明确显示“离线模式 · 使用设备时间（未校准）”。

## GitHub Pages

推送到仓库的 `main` 分支后，`.github/workflows/deploy-pages.yml` 会自动部署。首次使用时，在仓库 **Settings → Pages → Build and deployment** 选择 **GitHub Actions**。

GitHub Pages 已启用，访问地址将在部署完成后显示。
