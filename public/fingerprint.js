/**
 * 设备指纹生成器
 * 通过浏览器多个特征组合生成唯一设备ID
 */
(function () {
  'use strict';

  // 生成设备指纹
  function generateFingerprint() {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown',
      navigator.platform || 'unknown',
      // Canvas 指纹
      getCanvasFingerprint(),
      // WebGL 指纹
      getWebGLFingerprint(),
      // 字体指纹
      getFontFingerprint(),
    ];

    return sha256(components.join('|||'));
  }

  // Canvas 指纹
  function getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = "14px 'Arial'";
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('MavisKami', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('KAMI-CHECK', 4, 45);
      return canvas.toDataURL();
    } catch (e) {
      return 'canvas-fallback';
    }
  }

  // WebGL 指纹
  function getWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'no-webgl';
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      return debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) + '~' + gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.VENDOR) + '~' + gl.getParameter(gl.RENDERER);
    } catch (e) {
      return 'webgl-fallback';
    }
  }

  // 字体指纹
  function getFontFingerprint() {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';

    const spans = [];
    const detectFont = (font) => {
      const detected = baseFonts.map(base => {
        const span = document.createElement('span');
        span.style.fontSize = testSize;
        span.style.fontFamily = base;
        span.innerHTML = testString;
        document.body.appendChild(span);
        const width = span.offsetWidth;
        span.style.fontFamily = `"${font}", ${base}`;
        return span.offsetWidth !== width;
      });
      document.body.removeChild(span);
      return detected.some((d, i) => d);
    };

    const fonts = ['Arial', 'Arial Black', 'Comic Sans MS', 'Courier New', 'Georgia', 'Impact', 'Times New Roman', 'Trebuchet MS', 'Verdana'];
    return fonts.filter(detectFont).join(',');
  }

  // SHA-256 哈希
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // 获取当前设备ID（优先从 localStorage 读取）
  function getDeviceId() {
    let deviceId = localStorage.getItem('__kami_device_id__');
    if (!deviceId) {
      // 首次：生成并存储
      Promise.all([sha256(navigator.userAgent + screen.width + Math.random())]).then(results => {
        deviceId = results[0];
        localStorage.setItem('__kami_device_id__', deviceId);
      });
      // 同步方式用随机数做临时ID
      deviceId = Math.random().toString(36).substring(2) + Date.now();
      localStorage.setItem('__kami_device_id__', deviceId);
    }
    return deviceId;
  }

  // 获取设备指纹（异步，完整版）
  async function getFullFingerprint() {
    const fp = await generateFingerprint();
    const deviceId = localStorage.getItem('__kami_device_id__') || fp;
    localStorage.setItem('__kami_device_id__', deviceId);
    return deviceId;
  }

  // 暴露到全局
  window.__kami = {
    getFingerprint: generateFingerprint,
    getDeviceId,
    getFullFingerprint,
  };
})();