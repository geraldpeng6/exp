/**
 * 浏览器指纹生成工具
 * 用于生成唯一的浏览器标识，用于评论删除权限验证
 */

/**
 * 生成浏览器指纹
 * 基于多个浏览器特征生成唯一标识
 */
export function generateBrowserFingerprint(): string {
  if (typeof window === 'undefined') {
    // 服务端返回空字符串
    return '';
  }

  const features: string[] = [];

  try {
    // 用户代理
    features.push(navigator.userAgent || '');
    
    // 语言设置
    features.push(navigator.language || '');
    
    // 时区
    features.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    
    // 屏幕分辨率
    features.push(`${screen.width}x${screen.height}`);
    
    // 颜色深度
    features.push(screen.colorDepth.toString());
    
    // 像素比
    features.push(window.devicePixelRatio.toString());
    
    // 平台信息
    features.push(navigator.platform || '');
    
    // 硬件并发数
    features.push((navigator.hardwareConcurrency || 0).toString());
    
    // 内存信息（如果可用）
    if ('memory' in performance) {
      const memory = (performance as unknown as { memory?: { jsHeapSizeLimit?: number } }).memory;
      features.push(memory?.jsHeapSizeLimit?.toString() || '');
    }
    
    // Canvas 指纹
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Browser fingerprint test 🔒', 2, 2);
      features.push(canvas.toDataURL());
    }
    
    // WebGL 指纹
    const webglCanvas = document.createElement('canvas');
    const gl = webglCanvas.getContext('webgl') || webglCanvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        features.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '');
        features.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
      }
    }
    
  } catch (error) {
    console.warn('生成浏览器指纹时出错:', error);
  }

  // 将所有特征组合并生成哈希
  const combined = features.join('|');
  return simpleHash(combined);
}

/**
 * 简单哈希函数
 * 将字符串转换为固定长度的哈希值
 */
function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * 获取存储的浏览器指纹
 * 如果不存在则生成新的指纹并存储
 */
export function getBrowserFingerprint(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const storageKey = 'browser_fingerprint';
  
  try {
    // 尝试从 localStorage 获取
    let fingerprint = localStorage.getItem(storageKey);
    
    if (!fingerprint) {
      // 生成新的指纹
      fingerprint = generateBrowserFingerprint();
      
      // 存储到 localStorage
      if (fingerprint) {
        localStorage.setItem(storageKey, fingerprint);
      }
    }
    
    return fingerprint || '';
  } catch (error) {
    console.warn('获取浏览器指纹时出错:', error);
    // 如果 localStorage 不可用，直接生成指纹
    return generateBrowserFingerprint();
  }
}

/**
 * 验证浏览器指纹是否匹配
 */
export function verifyBrowserFingerprint(storedFingerprint: string): boolean {
  if (!storedFingerprint) {
    return false;
  }
  
  const currentFingerprint = getBrowserFingerprint();
  return currentFingerprint === storedFingerprint;
}

/**
 * 清除存储的浏览器指纹
 * 用于测试或重置
 */
export function clearBrowserFingerprint(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.removeItem('browser_fingerprint');
  } catch (error) {
    console.warn('清除浏览器指纹时出错:', error);
  }
}
