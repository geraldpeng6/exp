"use client";
import { Menu } from "@headlessui/react";
import { MoreVertical, Copy } from "lucide-react";

interface CommentDropdownProps {
  content: string;
}

export default function CommentDropdown({ content }: CommentDropdownProps) {


  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      // 可以添加一个 toast 提示
      console.log('评论内容已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      // 降级方案：选择文本
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        console.log('评论内容已复制到剪贴板');
      } catch (e) {
        console.error('复制失败:', e);
      }
      document.body.removeChild(textArea);
    }
  };





  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors duration-200">
        <MoreVertical className="h-4 w-4 text-gray-500" />
      </Menu.Button>

      <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
        <div className="py-1">
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={handleCopy}
                className={`${
                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                } group flex items-center w-full px-4 py-2 text-sm transition-colors duration-200`}
              >
                <Copy className="mr-3 h-4 w-4" />
                复制内容
              </button>
            )}
          </Menu.Item>

          {/* 删除菜单项已移除：用户界面不支持删除评论 */}
        </div>
      </Menu.Items>
    </Menu>
  );
}
