# 食材工坊 v0.2

重要项目，分类由用户于 2026-11-26 确认。完整过程记录、原始设计参考和 GitHub 来源原文在项目父目录中按用途保留。

## 本版可用

- 页面采用纸感与水墨山水，食材保留正常配色。复用 Culinary Assets 的 CC0 彩色素材、HowToCook 对应照片与 shan-shui-inf 的 MIT 山水图。
- 三道菜使用原谱成品照片，其余使用带标注的主料示意。鸡翅中为真实翅中熟制参考；没有核对准确彩图的食材显示文字。
- 原有食材、收藏和今日一桌的 ID 与本地存储键延续，继续使用当前代码目录维护。

- 12 道来自固定 HowToCook 提交的中文菜谱，46 种食材和调料。
- 菜名与食材别名搜索、分类、材料齐全/缺一种筛选。
- 用户选择与常备调料合并匹配；明确区分必需和原谱可选材料。
- 查看原谱用量、步骤与固定版本来源；不渲染原文 HTML。
- React Flow 菜品→食材→相关菜品探索，支持缩放与平移。
- 收藏、今日一桌、去重的缺料种类清单与 TXT 导出。
- 浏览器本地保存；窄屏适配。

## 复用决策

实际复用：HowToCook 菜谱文字、React、Zustand、React Flow、Lucide、Vite 与 TypeScript。

已阅读参考代码：YunYouJun/cook 的 `packages/cook/src/utils/search.ts` 和常备调料数据入口；recipe-display 的 `client/package.json` 与图数据编译工具 `graphUtils.js`。

未复制上述两个应用的业务代码。cook 使用不同的前端架构，其检索工具附带本项目不需要的相克规则；recipe-display 的图模型围绕烹调中间状态，整体导入会增加后端、营养数据和模型 API 依赖。本版复用底层库与已授权菜谱，只编写必要的中文匹配与页面逻辑。

## 数据边界

材料齐全仅指已勾选的种类覆盖全部 L1；不表示数量充足、工具齐全或膳食合理。水、锅具不参与食材匹配。首版未启用经验性的调料非线性公式，不生成未经核实的克重。盐、油可从常备库取消。

L1/L3 为本项目根据固定原谱所做的编辑标注；暂不人为区分提香 L2，不自动替代。每道菜的 annotationNote 保留口径与补录说明。菜谱本身属于社区经验内容，未经过实际烹调验证。

尚未实现：人数和菜数联动换算、中国地图、菜系偏好、自动平替、库存克重、自定义菜谱、跨设备同步。

## 本地开发

双电脑启动和分工见 [双电脑协作说明](docs/双电脑协作.md)。统一使用 Node.js 24.x 与 pnpm 11.25.0（不要跟随 latest 自动升级）。普通环境可执行：

```text
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
```

当前机器没有 PATH 中的 npm/pnpm，使用应用自带 pnpm。项目的 `scripts/install.mjs` 可通过 `SITES_PNPM_BIN` 指定 pnpm.cjs；未改变全局环境或系统配置。

`src/data` 是浏览器应用唯一数据源；`engine.ts` 是纯匹配函数；`store.ts` 负责本地状态；`App.tsx` 负责界面与关系图投影。后续可将人数换算和图投影拆分为独立模块。

## 许可与来源

详见 `public/third-party-notices.txt` 和每道菜的 source 字段。保留 HowToCook 固定提交、原路径、获取日与原文 SHA256。第三方许可里的作者/版权声明属于正常归属信息，应保留。
