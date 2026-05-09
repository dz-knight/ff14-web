# 部署说明

## GitHub Pages

仓库已推送到：

```text
https://github.com/dz-knight/ff14-web
```

### 开启 Pages

1. 打开仓库 `Settings`
2. 进入 `Pages`
3. `Source` 选择 `Deploy from a branch`
4. 分支选择 `main`
5. 目录选择 `/root`
6. 保存

默认地址通常是：

```text
https://dz-knight.github.io/ff14-web/
```

## 自定义域名

如果要绑定自定义域名：

1. 先在 `Pages` 中填写自定义域名
2. 在域名 DNS 里配置解析

常见方式：

- 子域名：
  - `CNAME -> dz-knight.github.io`
- 裸域：
  - `A -> 185.199.108.153`
  - `A -> 185.199.109.153`
  - `A -> 185.199.110.153`
  - `A -> 185.199.111.153`

## 注意事项

- 这是纯静态站，不需要单独申请公网 IP
- 页面运行依赖公开接口可访问
- `data/item_mapping.min.json` 会作为静态资源公开发布

