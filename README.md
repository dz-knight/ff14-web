# FF14 物价百科 Web

纯静态网页版，支持中文搜索、国服价格查询和国服 Wiki 外链。

## 特点

- 纯静态文件，无需自建后端
- 本地双语映射表搜索
- 直接查询 Universalis 和 XivAPI / CafeMaker
- 搜索无结果时跳转国服 Wiki

## 目录

```text
ff14-web/
  index.html
  app.js
  static-overrides.js
  styles.css
  data/item_mapping.min.json
```

## 本地预览

```powershell
cd /d E:\study\ff14网页
python -m http.server 8080
```

打开：

```text
http://127.0.0.1:8080
```

## 部署

推荐直接部署到 GitHub Pages。具体步骤见 [DEPLOY.md](./DEPLOY.md)。

