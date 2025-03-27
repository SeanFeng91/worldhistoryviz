# 世界历史地图可视化项目

这是一个交互式世界历史地图可视化项目，展示了从史前到现代的重要历史事件、人口迁徙、技术发展、物种驯化和文明演变。

## 项目特点

- 按时间轴浏览世界历史变迁
- 查看各个时期的历史事件、迁徙路线、科技发展
- 多种数据类型：历史事件、人口迁徙、技术发展、物种驯化、文明演变、战争、疾病和农业
- 支持黑暗模式和浅色模式
- 交互式地图界面，支持缩放和平移

## 直接从 GitHub 部署到 Cloudflare Pages

### 准备工作

1. 确保您有一个 Cloudflare 账号
2. 将项目推送到 GitHub 仓库
3. 确保项目结构如下：

```
WorldHistoryViz/
├── css/                # 样式文件
├── data/               # 数据文件
├── js/                 # JavaScript文件
├── maps/               # 地图文件
│   └── geojson/        # GeoJSON地图数据
├── _headers            # HTTP头部配置
├── _redirects          # 路由重定向配置
├── 404.html            # 自定义404页面
├── robots.txt          # 搜索引擎配置
└── index.html          # 主页面
```

### 部署步骤

1. 登录到 Cloudflare 控制面板
2. 前往 "Pages" 部分
3. 点击 "连接到 Git"
4. 选择您的 GitHub 账号并授权 Cloudflare 访问
5. 选择您的历史地图仓库
6. 配置部署设置：
   - 构建设置: 无需设置 (静态网站)
   - 构建命令: 留空
   - 构建输出目录: 留空 (使用根目录)
   - 环境变量: 通常不需要设置
7. 点击 "保存并部署"

### 关键配置

以下文件确保应用在Cloudflare Pages上正常运行：

1. `_headers` 文件：配置HTTP响应头，解决CORS问题
```
/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, OPTIONS
  Access-Control-Allow-Headers: Content-Type
```

2. `_redirects` 文件：确保单页应用(SPA)的路由功能正常工作
```
/* /index.html 200
```

3. `404.html`：当访问不存在的路径时显示的自定义错误页面

4. `robots.txt`：指导搜索引擎如何爬取您的站点
```
User-agent: *
Allow: /

Sitemap: https://你的域名/sitemap.xml
```

5. 确保所有资源使用相对路径，避免部署后路径问题

## 地图文件准备

为了确保应用程序可以找到地图文件，请将历史地图复制到 `maps/geojson/` 目录：

```bash
mkdir -p maps/geojson
cp -r historical-basemaps/geojson/* maps/geojson/
```

## 文件结构说明

- `css/`: 包含所有样式文件
- `data/`: 包含历史数据JSON文件
- `js/`: 包含应用程序的JavaScript代码
- `maps/geojson/`: 包含历史时期的GeoJSON地图数据
- `_headers`: Cloudflare Pages HTTP头部配置
- `_redirects`: 单页应用路由重定向配置
- `404.html`: 自定义404错误页面
- `robots.txt`: 搜索引擎爬虫配置
- `index.html`: 主HTML页面

## 部署后的域名设置

部署成功后，Cloudflare Pages会自动分配一个`*.pages.dev`的域名。您可以：

1. 使用这个自动分配的域名
2. 在Cloudflare控制面板中设置自定义域名：
   - 进入项目设置 → 自定义域
   - 添加您自己的域名并按照指引完成DNS设置

## 本地开发

1. 安装本地服务器（如http-server）：

```bash
npm install -g http-server
```

2. 启动本地服务器：

```bash
http-server -p 8080
```

3. 在浏览器中打开 [http://localhost:8080](http://localhost:8080)

## 许可证

MIT 