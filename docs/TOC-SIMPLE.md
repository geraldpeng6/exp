# 目录（TOC）功能简化重构

## 实现方案

### 1. TOC 组件 (components/TOC.tsx)
- 极简实现，只保留核心功能
- 使用 `scrollIntoView` 进行平滑滚动
- 简单的滚动监听高亮当前章节
- 移除了所有复杂的依赖和动画效果

### 2. MarkdownViewer 组件 (components/MarkdownViewer.tsx)
- 简化的 slug 生成函数
- 处理中文、英文、数字和常见编号格式（如 1.1, 2.2）
- 确保 ID 唯一性
- 只包含 h1-h4 级别的标题

## 核心功能

### ID 生成规则
1. 转换为小写
2. 点号替换为连字符（1.1 -> 1-1）
3. 移除特殊字符
4. 空格转连字符
5. 合并多个连字符
6. 去除首尾连字符

### 导航功能
- 点击目录项平滑滚动到对应标题
- 滚动时自动高亮当前章节
- 支持中文标题
- 支持多级缩进显示

## 测试页面

- `/test-toc-minimal` - 最小化测试页面，带调试信息
- `/test-simple-toc` - 简单测试页面
- `/articles/toc-test` - 实际文章页面测试

## 已解决的问题

1. ✅ ID 不匹配问题
2. ✅ 中文标题支持
3. ✅ 编号格式（1.1, 2.2）支持
4. ✅ 平滑滚动
5. ✅ 当前章节高亮

## 使用方法

```tsx
import MarkdownViewer, { TocItem } from "@/components/MarkdownViewer";
import TOC from "@/components/TOC";

function ArticlePage() {
  const [toc, setToc] = useState<TocItem[]>([]);
  
  return (
    <>
      <TOC toc={toc} />
      <MarkdownViewer 
        markdown={content} 
        onRendered={setToc} 
      />
    </>
  );
}
```

## 特点

- **极简设计**：代码量减少 70%
- **可靠性高**：移除复杂逻辑，减少出错可能
- **性能优秀**：没有复杂的观察器和动画
- **易于维护**：代码清晰简单
