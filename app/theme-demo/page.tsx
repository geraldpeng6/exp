"use client";

import ThemeToggle, { SimpleThemeToggle } from '@/components/ThemeToggle';
import MarkdownViewer from "@/components/MarkdownViewer";
import { useState } from "react";

const demoMarkdown = `
# 代码块演示

## JavaScript 代码

\`\`\`javascript
// 一个简单的 React 组件
function Welcome({ name }) {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);
    console.log(\`Button clicked \${count + 1} times\`);
  };

  return (
    <div className="welcome-container">
      <h1>Hello, {name}!</h1>
      <p>You've clicked {count} times</p>
      <button onClick={handleClick}>
        Click me
      </button>
    </div>
  );
}
\`\`\`

## Python 代码

\`\`\`python
# 斐波那契数列生成器
def fibonacci(n):
    """生成前n个斐波那契数"""
    if n <= 0:
        return []
    elif n == 1:
        return [0]

    fib_sequence = [0, 1]
    for i in range(2, n):
        next_num = fib_sequence[i-1] + fib_sequence[i-2]
        fib_sequence.append(next_num)

    return fib_sequence

# 使用示例
result = fibonacci(10)
print(f"前10个斐波那契数: {result}")
\`\`\`

## CSS 代码

\`\`\`css
/* 响应式卡片布局 */
.card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}
\`\`\`

## 内联代码

除了代码块，内联代码 \`const example = "inline code"\` 也会根据主题自动调整样式。
`;

/**
 * 主题演示页面
 * 展示主题切换功能和各种组件在不同主题下的效果
 */

export default function ThemeDemoPage() {
  const [toc, setToc] = useState<any[]>([]);

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          🌙 主题切换演示
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          体验智能主题切换功能，包含自动时间判断和手动控制
        </p>

        {/* 主题切换按钮展示 */}
        <div className="flex items-center justify-center gap-8 mb-8">
          <div className="text-center">
            <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              完整版切换按钮
            </h3>
            <ThemeToggle />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              简化版切换按钮
            </h3>
            <SimpleThemeToggle />
          </div>
        </div>
      </div>

      {/* 功能说明 */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            🌅 自动模式
          </h2>
          <ul className="space-y-2 text-gray-600 dark:text-gray-400">
            <li>• 18:00-06:00 自动切换到深色模式</li>
            <li>• 06:00-18:00 自动切换到浅色模式</li>
            <li>• 支持系统主题偏好检测</li>
            <li>• 每分钟检查一次时间变化</li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            🎮 手动控制
          </h2>
          <ul className="space-y-2 text-gray-600 dark:text-gray-400">
            <li>• 点击按钮在三种模式间切换</li>
            <li>• 自动 → 浅色 → 深色 → 自动</li>
            <li>• 用户偏好自动保存</li>
            <li>• 状态指示器显示当前模式</li>
          </ul>
        </div>
      </div>

      {/* 动画效果展示 */}
      <div className="bg-gradient-to-r from-yellow-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          ✨ 动画效果
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
            <div className="text-4xl mb-2">☀️</div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">太阳升起</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              切换到浅色模式时，太阳从下方升起并旋转
            </p>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
            <div className="text-4xl mb-2">🌙</div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">月亮升起</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              切换到深色模式时，月亮从上方降下并旋转
            </p>
          </div>
        </div>
      </div>

      {/* 代码块展示 */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          💻 代码块展示
        </h2>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>功能特点：</strong>
          </p>
          <ul className="mt-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
            <li>代码块有清晰的边框，在深色和浅色主题下都有良好的对比度</li>
            <li>鼠标悬停在代码块上时，右上角会显示复制按钮</li>
            <li>点击复制按钮可以复制代码内容</li>
            <li>语法高亮会根据当前主题自动切换配色</li>
          </ul>
        </div>
        <MarkdownViewer
          markdown={demoMarkdown}
          onRendered={setToc}
        />
      </div>

      {/* 组件展示 */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          🎨 其他组件效果展示
        </h2>
        
        {/* 按钮组 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">按钮</h3>
          <div className="flex flex-wrap gap-4">
            <button className="button">默认按钮</button>
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
              主要按钮
            </button>
            <button className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-lg transition-colors">
              次要按钮
            </button>
          </div>
        </div>

        {/* 卡片 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">卡片</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">卡片标题</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                这是一个示例卡片，展示在不同主题下的效果。
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">另一个卡片</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                注意颜色和边框在主题切换时的平滑过渡。
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">第三个卡片</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                所有元素都支持深色模式适配。
              </p>
            </div>
          </div>
        </div>

        {/* 表单元素 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">表单元素</h3>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  输入框
                </label>
                <input
                  type="text"
                  placeholder="输入一些文字..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  文本域
                </label>
                <textarea
                  placeholder="输入多行文字..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 返回链接 */}
      <div className="text-center pt-8">
        <a
          href="/"
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
        >
          ← 返回首页
        </a>
      </div>
    </div>
  );
}
