# 时光印纪 · uni-app 项目

私人人生成长记录 App。依据《时光印纪 App 完整产品交付文档 V1.0》开发,本地静态实现全部功能,无后端依赖。

## 项目结构

```
TimeImprint/
├── App.vue                    # 应用入口:初始化数据库、记录最后停留页面
├── main.js                    # Vue3 启动入口
├── manifest.json              # 应用配置(App权限/小程序配置)
├── pages.json                 # 19 个页面路由 + 4 个 tabBar
├── uni.scss                   # 视觉规范变量(颜色/字体/圆角/间距)
├── pages/
│   ├── splash/                # 闪屏页
│   ├── guide/                 # 引导页
│   ├── index/                 # 首页·人生时间轴(核心)
│   ├── search/                # 搜索(关键词+年份筛选)
│   ├── memory/
│   │   ├── create             # 创建时光印记(tab-记录)
│   │   ├── edit               # 编辑时光印记
│   │   └── detail             # 记录详情
│   ├── archive/
│   │   ├── archive            # 成长档案馆(快照统计+情绪图表)
│   │   ├── stage              # 人生阶段集
│   │   ├── highlight          # 高光回忆集
│   │   ├── compare            # 成长对比
│   │   └── wander             # 回忆漫游
│   └── mine/
│       ├── mine               # 我的(tab)
│       ├── profile            # 个人档案(首次填写/编辑共用)
│       ├── backup             # 数据备份(本地备份/恢复)
│       ├── privacy            # 隐私设置(含清空数据)
│       ├── calendar           # 日历回看
│       ├── export             # 导出回忆录
│       └── about              # 关于
├── components/                # easycom 组件
│   ├── memory-form/           # 创建/编辑共用表单
│   ├── memory-card/           # 印记卡片
│   ├── media-grid/            # 图片网格+视频播放
│   ├── voice-bar/             # 语音播放条
│   ├── emotion-picker/        # 情绪表情选择器
│   └── empty-state/           # 空状态占位
├── utils/
│   ├── db.js                  # 存储抽象层:App端 SQLite(plus.sqlite),小程序/H5端 storage
│   ├── media.js               # 媒体选择/持久化/录音
│   ├── date.js                # 日期工具、年龄计算
│   ├── stage.js               # 人生阶段规则(PRD 3.7)+ 情绪表
│   └── exporter.js            # 回忆录生成/备份/素材包导出
├── store/                     # 全局状态(用户档案)
└── static/                    # logo、tab图标、引导插画(源自UI设计图)
```

## 数据模型(PRD 3.6)

`user` / `memory` / `media` / `highlight` / `growth_comparison` 五张表,字段与 PRD 一致,另补充 `memory.isArchived`(长按归档)。

## 使用 HBuilderX 运行

1. HBuilderX(3.8+)打开本项目目录;
2. 运行 → 运行到浏览器 / 内置浏览器(H5 预览)、或 运行到手机或模拟器(Android);
3. 微信小程序:运行 → 运行到小程序模拟器 → 微信开发者工具(需在 `manifest.json` → `mp-weixin.appid` 填入你的小程序 AppID)。

## 打包

| 端 | 方式 |
|---|---|
| Android | HBuilderX → 发行 → 原生App-云打包(已配置相机/麦克风/存储权限) |
| iOS | 同上,已配置相册/相机/麦克风用途描述(privacyDescription);需苹果开发者账号与证书 |
| 微信小程序 | 发行 → 小程序-微信(填入 AppID) |

首次使用 HBuilderX 需在 `manifest.json` 基础配置中点击"重新获取"生成 uni-app appid。

## 端差异说明

- **数据库**:App 端使用 SQLite(`_doc/timeimprint.db`,媒体文件存于 `_doc/timeimprint/`);小程序端无 SQLite 能力,自动降级为本地 Storage 存储,业务代码无感知。
- **录音**:App / 微信小程序支持;H5 不支持(自动提示)。
- **素材包 zip 导出**:仅 App 端;小程序端文字导出至剪贴板。
- **人生进度**:按参考寿命 80 岁做纪念性展示,不做焦虑引导(PRD 2.6)。

## 需求覆盖

- P0:个人档案、创建/编辑/删除印记(文字/图片/语音/表情)、纵向时间轴、记录详情、高光标记、本地导出 ✅
- P1:人生阶段集、成长快照统计、本地备份、隐私设置(含清空数据)✅(云端加密备份为占位,待接口服务)
- P2:视频、情绪图表、成长对比、回忆漫游、日历回看、回忆录导出 ✅(PDF 导出待接口服务,当前为文字版)
