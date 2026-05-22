# Phase 0 — 任务清单

> 颗粒度：每条任务约对应一个 PR。完成时勾选 + 关联 PR 编号。

---

## 0.1 仓库脚手架

- [ ] 0.1.1 创建 `package.json`，依赖：`react@18`、`react-dom@18`、`@tauri-apps/api@^2`、`@tauri-apps/plugin-notification@^2`、`zustand@5`，devDep：`typescript@5.7`、`vite@^8`、`@vitejs/plugin-react`、`tailwindcss@3.4`、`postcss`、`autoprefixer`
- [ ] 0.1.2 创建 `tsconfig.json`（strict、target ES2022、moduleResolution bundler）
- [ ] 0.1.3 创建 `vite.config.ts`（Tauri 推荐配置：`clearScreen: false`、`server.port: 1420`、`server.strictPort: true`）
- [ ] 0.1.4 创建 `tailwind.config.js` + `postcss.config.cjs` + `src/index.css`（包含 `@tailwind` 三件套）
- [ ] 0.1.5 创建 `index.html`（标题 ZooWallet，挂载点 `#root`）

## 0.2 前端最小骨架

- [ ] 0.2.1 `src/main.tsx` —— 渲染 `<App />`
- [ ] 0.2.2 `src/App.tsx` —— 内部包 `<ErrorBoundary>`，渲染 `<AppInner />`
- [ ] 0.2.3 `src/components/ErrorBoundary.tsx` —— 类组件，捕获渲染异常并渲染 fallback
- [ ] 0.2.4 `src/lib/ipc.ts` —— 导出 `safeInvoke<T>(cmd, args)`、`IpcError` 类、`zoo` 命名空间（先放一个 `zoo.appVersion()` demo 调用）
- [ ] 0.2.5 `src/types/` 占位（后续填 `AccountMeta` 等）
- [ ] 0.2.6 `src/stores/` 占位（后续填 Zustand stores）

## 0.3 Rust 后端最小骨架

- [ ] 0.3.1 `src-tauri/Cargo.toml` —— `[package]` + `[dependencies]` 仅 `tauri = { version = "2", features = [...] }`、`serde`、`serde_json`、`log`、`env_logger`
- [ ] 0.3.2 `src-tauri/src/main.rs` —— `fn main() { zoowallet_lib::run() }`
- [ ] 0.3.3 `src-tauri/src/lib.rs` —— `pub fn run()` 注册 `app_version` 命令并启动 Tauri
- [ ] 0.3.4 `src-tauri/src/commands/mod.rs` —— 暴露 `app_version` 占位命令（返回 `env!("CARGO_PKG_VERSION")`）
- [ ] 0.3.5 `src-tauri/src/services/mod.rs` —— 空模块占位
- [ ] 0.3.6 `src-tauri/src/models/mod.rs` —— 空模块占位
- [ ] 0.3.7 `src-tauri/tauri.conf.json` —— productName `ZooWallet`、identifier `com.zoowallet.app`、严格 CSP（开发期允许 localhost:1420）
- [ ] 0.3.8 `src-tauri/build.rs` —— 标准 Tauri build 脚本

## 0.4 工作流

- [ ] 0.4.1 `Makefile` —— 实现 `install`、`dev`、`build`、`check`、`lint`、`fmt`、`help` 七个 target；`help` 用 `awk` 解析注释生成
- [ ] 0.4.2 `.gitignore` 补全：`node_modules/`、`dist/`、`src-tauri/target/`、`.DS_Store`（保留现有 Rust 默认条目）
- [ ] 0.4.3 `.editorconfig`（2 空格 TS、4 空格 Rust）
- [ ] 0.4.4 提交 `yarn.lock` 和 `src-tauri/Cargo.lock`

## 0.5 验证

- [ ] 0.5.1 `make install` 在干净环境一次成功
- [ ] 0.5.2 `make dev` 起得来，Tauri 窗口显示 `ZooWallet vX.Y.Z`（X.Y.Z 来自 `app_version` IPC 调用）
- [ ] 0.5.3 `make check` 全绿
- [ ] 0.5.4 故意在 `safeInvoke` 抛错，验证 `ErrorBoundary` 捕获到位
- [ ] 0.5.5 在 PR 描述里贴运行截图

## 退出条件

满足 [requirements.md 验收标准](./requirements.md#验收标准) 全部勾选后，关闭本 phase；下一步进入 [phase-1-mvp](../phase-1-mvp/requirements.md)。
