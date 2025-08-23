---
title: "Callouts 与数学公式示例（中文）"
date: 2025-08-23T12:00:00.000Z
summary: "演示 GitHub 风格提示块与数学公式（KaTeX/行内与块/代码围栏）渲染。"
tags: ["Markdown", "提示块", "数学公式"]
---

# 介绍

本文专门用于演示以下能力：
- GitHub 风格提示块（[!NOTE]/[!TIP]/[!WARNING]/[!IMPORTANT]/[!CAUTION]）
- 数学公式渲染：行内 `$...$`、块级 `$$...$$`、以及代码围栏 ```latex/tex/math```

---

# 提示块（Callouts）

> [!NOTE]
> 这是一个 Note 提示（独占一行的写法）。
> 第二行内容也会被包含在提示中。

> [!TIP] 同行写法：这是一个小技巧（Tip）。

> [!WARNING]
> 注意：这里是警告（Warning）。

> [!IMPORTANT] 同行：关键信息需要被强调（Important）。

> [!CAUTION]
> 小心使用（Caution）。

> [!INFO]
> 这是一条信息（Info）。

> [!SUCCESS] 同行：操作成功（Success）。

---

# 数学（Math）

- 行内公式示例：爱因斯坦质能方程 $E = mc^2$。
- 另一个行内示例：二项式定理 $(a+b)^2 = a^2 + 2ab + b^2$。

块级公式（使用 $$...$$）：

$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$

代码围栏（latex）：

```latex
E = mc^2\\
\int_0^1 x^2\,dx = \frac{1}{3}
```

代码围栏（math）：

```math
\sum_{k=1}^{n} k = \frac{n(n+1)}{2}
```

---

# 结语

如果你看到样式或渲染有异常，欢迎反馈以便继续优化展示效果。

