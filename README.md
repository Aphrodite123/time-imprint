# 时光印纪 · uni-app 项目

私人人生成长记录 App。依据《时光印纪 App 完整产品交付文档 V1.0》开发,本地静态实现全部功能,无后端依赖。

## 项目结构

```
TimeImprint/
├── App.vue                    # 应用入口:初始化数据库、载入用户档案、开启小程序分享菜单
├── main.js                    # Vue3 启动入口
├── index.html                 # H5 入口模板
├── manifest.json              # 应用配置(uni-app appid / 微信 appid / App 权限)
├── pages.json                 # 24 个页面路由(自定义导航栏)
├── uni.scss                   # 视觉规范变量(颜色/字体/圆角/间距)
├── pages/
│   ├── splash/                # 闪屏页
│   ├── guide/                 # 引导页
│   ├── index/                 # 首页·人生时间轴(tab,核心)
│   ├── records/               # 记录(tab):全部印记列表,按年份分组,支持高光/语音/照片筛选
│   ├── search/                # 搜索(关键词+年份筛选)
│   ├── memory/
│   │   ├── create             # 创建时光印记(tab 中央"新增印记"按钮)
│   │   ├── edit               # 编辑时光印记
│   │   └── detail             # 记录详情
│   ├── archive/
│   │   ├── archive            # 成长档案馆(tab,快照统计+情绪图表)
│   │   ├── stage              # 人生阶段集
│   │   ├── highlight          # 高光回忆集(1~5 星级体系)
│   │   ├── album              # 高光纪念册(纪念照按年份自动成册)
│   │   ├── album-create       # 制作纪念照(1~9 张照片 + 装帧模板)
│   │   ├── album-detail       # 纪念照详情(查看/编辑/导出图片)
│   │   ├── compare            # 成长对比
│   │   └── wander             # 回忆漫游
│   └── mine/
│       ├── mine               # 我的(tab)
│       ├── profile            # 个人档案(首次填写/编辑共用)
│       ├── settings           # 设置(语言/语音播放速度/数据入口)
│       ├── backup             # 数据备份(本地备份/恢复)
│       ├── privacy            # 隐私设置(含清空数据)
│       ├── calendar           # 日历回看
│       ├── export             # 导出回忆录
│       └── about              # 关于
├── components/                # easycom 组件
│   ├── nav-bar/               # 自定义导航栏(自动避让小程序右上角胶囊)
│   ├── tab-bar/               # 通栏停靠式底部导航(首页/记录/新增印记/档案馆/我的)
│   ├── memory-form/           # 创建/编辑共用表单
│   ├── memory-card/           # 印记卡片
│   ├── memory-thumb/          # 列表缩略图(照片>视频首帧>语音声波>表情)
│   ├── media-grid/            # 图片网格+视频播放
│   ├── voice-bar/             # 语音播放条(联动全局播放器)
│   ├── emotion-picker/        # 情绪表情选择器
│   ├── photo-card/            # 纪念照卡片(装帧模板渲染)
│   ├── star-rate/             # 高光星级选择器(1~5 星)
│   └── empty-state/           # 空状态占位
├── utils/
│   ├── db.js                  # 存储抽象层:App端 SQLite(plus.sqlite),小程序/H5端 storage
│   ├── media.js               # 媒体选择/持久化/录音
│   ├── date.js                # 日期工具、年龄计算
│   ├── stage.js               # 人生阶段规则(PRD 3.7)+ 情绪表
│   ├── highlight.js           # 高光星数规则:1~5 星档位(心动一瞬~一生珍藏)
│   ├── album.js               # 纪念册规则:装帧模板/版式排布/年度分册
│   ├── card-canvas.js         # 纪念照导出:离屏 canvas 合成 750×938(4:5) 图片,三端通用
│   ├── voice-player.js        # 全局共享语音播放器(单实例/进度记忆/倍速)
│   ├── nav.js                 # 自定义导航栏度量(小程序胶囊避让)
│   ├── share.js               # 小程序转发/朋友圈分享(固定品牌封面,不泄露记录内容)
│   └── exporter.js            # 回忆录生成/备份/素材包导出
├── store/                     # 全局状态(用户档案)
├── docs/
│   ├── blog/                  # 产品设计笔记、公众号文章与截图
│   └── design/memorial-album/ # 纪念册功能方案 + 高保真原型(index.html)
└── static/                    # logo、tab图标、引导插画、菜单/入口/工具图标、分享封面
```

> 底部导航为自定义组件 `tab-bar`(4 个 tab + 中央"新增印记"胶囊按钮),未使用 pages.json 原生 tabBar,页面间以 `uni.reLaunch` 切换。

## 数据模型(PRD 3.6)

`user` / `memory` / `media` / `highlight` / `photo_card` / `growth_comparison` 六张表,字段与 PRD 一致,另补充:

- `memory.isArchived`(长按归档)、`memory.isFavorite`(收藏)、`memory.highlightLevel`(高光星级 1~5,默认 3)
- `photo_card`:纪念照(装帧模板/版式/标题/题注/星级/照片列表),详见 `docs/design/memorial-album/纪念册-功能方案.md`

## 使用 HBuilderX 运行

1. HBuilderX(3.8+)打开本项目目录;
2. 运行 → 运行到浏览器 / 内置浏览器(H5 预览)、或 运行到手机或模拟器(Android);
3. 微信小程序:运行 → 运行到小程序模拟器 → 微信开发者工具(`manifest.json` 中 `mp-weixin.appid` 已配置,可按需替换为自己的 AppID)。

## 打包

| 端 | 方式 |
|---|---|
| Android | HBuilderX → 发行 → 原生App-云打包(已配置相机/麦克风/存储权限;签名密钥库不入库,自行保管) |
| iOS | 同上,已配置相册/相机/麦克风用途描述(privacyDescription);需苹果开发者账号与证书 |
| 微信小程序 | 发行 → 小程序-微信(AppID 已填入 manifest.json) |

uni-app appid 已在 `manifest.json` 中配置(`__UNI__3248092`),无需重新获取。

## 端差异说明

- **数据库**:App 端使用 SQLite(`_doc/timeimprint.db`,媒体文件存于 `_doc/timeimprint/`);小程序端无 SQLite 能力,自动降级为本地 Storage 存储,业务代码无感知。
- **录音**:App / 微信小程序支持;H5 不支持(自动提示)。
- **语音播放**:三端共用全局播放器 `voice-player`,支持进度记忆与倍速(设置页可调)。
- **素材包 zip 导出**:仅 App 端;小程序端文字导出至剪贴板。
- **纪念照导出**:离屏 canvas 合成 4:5 图片,三端通用。
- **分享**:仅微信小程序(转发给朋友/分享到朋友圈);因数据全部在本地,分享卡片统一指向首页推广,封面固定用品牌图,避免页面截图泄露隐私。
- **人生进度**:按参考寿命 80 岁做纪念性展示,不做焦虑引导(PRD 2.6)。

## 需求覆盖

- P0:个人档案、创建/编辑/删除印记(文字/图片/视频/语音/表情)、纵向时间轴、记录列表、搜索、记录详情、高光标记、本地导出 ✅
- P1:人生阶段集、成长快照统计、本地备份、隐私设置(含清空数据)✅(云端加密备份为占位,待接口服务)
- P2:视频、情绪图表、成长对比、回忆漫游、日历回看、回忆录导出 ✅(PDF 导出待接口服务,当前为文字版)
- 新增:高光 1~5 星级体系、高光纪念册(装帧模板/年度分册/纪念照图片导出)、微信转发与朋友圈分享、语音倍速播放 ✅
