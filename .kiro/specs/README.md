# ZooWallet Specs

本目录采用 **Spec-Driven Development**：每个新功能或模块在写代码之前，先在这里建立一个子目录，沉淀需求、设计、任务三件事。

---

## 目录结构

```
.kiro/specs/
├── README.md                       # 本文件
├── 00-overview.md                  # 8 阶段路线图（MVP 优先）
├── phase-0-foundation/             # 项目骨架（不含真实加密逻辑）
│   ├── requirements.md
│   └── tasks.md
├── phase-1-mvp/                    # 单链 ETH 最小可用钱包
│   ├── requirements.md
│   ├── design.md
│   └── tasks.md
└── phase-N-<name>/                 # 后续阶段按需新增
```

---

## 标准三件套

每个 phase 子目录建议包含：

| 文件 | 内容 | 必填 |
|------|------|------|
| `requirements.md` | 用户故事 + 验收标准；明确"做什么"和"什么算完成" | ✅ |
| `design.md` | 技术方案、模块划分、数据流、关键决策；引用 `docs/ARCHITECTURE.md` 与 `docs/API.md` | 推荐 |
| `tasks.md` | 实际的勾选清单，颗粒度到"一个 PR 能合"的级别 | ✅ |

`design.md` 在 phase-0 这种纯脚手架阶段可以省略；引入新链或重构核心服务时**必须**有。

---

## 工作流

1. 用户提出新功能 / 新链支持
2. Kiro 在 `.kiro/specs/phase-N-<name>/` 下补全 requirements + tasks（必要时 design）
3. 评审通过后进入实现：每条 task 对应一个或几个 PR
4. PR 关闭时勾选 `tasks.md` 对应条目；phase 完成后更新 `00-overview.md` 状态表

---

## 引用规范

Spec 文件可使用 Kiro 文件引用语法把架构 / API 拉进上下文：

```
#[[file:docs/ARCHITECTURE.md]]
#[[file:docs/API.md]]
```

避免在 spec 里复制粘贴 API 表格，**永远引用源文件**。

---

## 与 Steering 的关系

- `.kiro/steering/*.md` —— **横切**约定（技术栈、安全红线、Makefile 约定），所有 phase 共用
- `.kiro/specs/*/` —— **垂直**切片（某 phase 要做什么、怎么做、做完没）

如果某条规则只在某 phase 内有效，写在该 phase 的 design.md 里；如果跨 phase 有效，提升到 steering。
