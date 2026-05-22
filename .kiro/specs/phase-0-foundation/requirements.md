# Phase 0 — 项目骨架

> 引用：[`docs/ARCHITECTURE.md §3.1`](../../../docs/ARCHITECTURE.md#31-模块组织) · [`tech-stack.md`](../../steering/tech-stack.md)

---

## 目标

搭建可编译、可启动、目录结构合规的 Tauri v2 + React 18 + Rust 空壳。**不写任何加密 / 区块链逻辑**，保证后续每个 phase 都有干净的起点。

## 用户故事

> **作为开发者**，我执行 `make install` 一次，再执行 `make dev`，就能看到 Tauri 窗口里弹出一个写着 "ZooWallet" 的 React 页面，证明前后端 + IPC 链路联通。

## 验收标准

- [ ] 仓库根目录有 `Makefile`，至少实现 `install` / `dev` / `build` / `check` / `help` 五个 target
- [ ] `make install` 在 Linux/macOS 全新克隆环境执行成功（CI 至少 Linux 通过）
- [ ] `make dev` 启动 Vite + Tauri，浏览器侧加载 React 应用，窗口标题为 `ZooWallet`
- [ ] 前端通过 `safeInvoke` 调用一个 demo 命令（如 `app_version`），返回字符串显示在页面上 —— **证明 IPC 桥可用**
- [ ] `make check` 同时跑 `cargo check` 和 `tsc --noEmit`，全部通过
- [ ] 目录结构对齐 [`tech-stack.md §4`](../../steering/tech-stack.md#4-目录约定)
- [ ] `Cargo.lock` 和 `yarn.lock` 已提交
- [ ] `tauri.conf.json` 的 CSP 已配置为严格白名单（开发期可放开 localhost）
- [ ] 全局 `<ErrorBoundary>` 已就位（即使现在没东西可错）

## 显式不做

- 任何 wallet / eth / btc / sol / evm / price 命令的真实实现 —— 一行加密代码都不写
- Zustand store、UI 组件库、Tailwind 主题细节 —— 给到能跑就行
- SQLite、RPC 故障切换、缓存表结构
- 测试套件（除非用户后续明确要求）

## 风险与决策

- **Tauri v2 仍在演进**：固定到 PR 提交时的 latest stable，并在 `Cargo.toml` 用 `=` 精确锁定关键 crate
- **rustls vs OpenSSL**：默认走 `reqwest` 的 `rustls-tls` feature，避免引入系统 OpenSSL
- **Yarn classic vs Berry**：用 classic（v1.x），与 Tauri 官方模板一致
