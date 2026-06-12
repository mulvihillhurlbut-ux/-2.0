/**
 * 卡密验证界面
 * 在网站内容之上显示验证弹窗
 */
(function () {
  'use strict';

  const VERIFY_ENDPOINT = '/.netlify/functions/verify-key';
  const STORAGE_KEY = '__kami_passed__';

  // 检查是否已验证通过
  function isVerified() {
    return localStorage.getItem(STORAGE_KEY) === '1';
  }

  // 渲染验证界面
  function renderUI() {
    if (document.getElementById('__kami_verify__')) return;

    const overlay = document.createElement('div');
    overlay.id = '__kami_verify__';
    overlay.innerHTML = `
      <style>
        #__kami_verify__ {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        #__kami_verify__.hidden { display: none; }
        .__kami_card__ {
          background: #fff;
          border-radius: 16px;
          padding: 40px 36px;
          width: 360px;
          max-width: 90vw;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          text-align: center;
        }
        .__kami_icon__ {
          width: 64px;
          height: 64px;
          margin: 0 auto 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
        }
        .__kami_title__ {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0 0 8px;
        }
        .__kami_sub__ {
          font-size: 14px;
          color: #666;
          margin: 0 0 28px;
          line-height: 1.5;
        }
        .__kami_input__ {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 16px;
          text-align: center;
          letter-spacing: 4px;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
          margin-bottom: 16px;
        }
        .__kami_input__:focus {
          border-color: #667eea;
        }
        .__kami_input__.error {
          border-color: #e53e3e;
          animation: __kami_shake__ 0.4s ease;
        }
        @keyframes __kami_shake__ {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .__kami_btn__ {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
        }
        .__kami_btn__:hover { opacity: 0.9; }
        .__kami_btn__:active { transform: scale(0.98); }
        .__kami_btn__:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .__kami_msg__ {
          margin-top: 14px;
          font-size: 13px;
          min-height: 20px;
          transition: all 0.2s;
        }
        .__kami_msg__.ok { color: #38a169; }
        .__kami_msg__.err { color: #e53e3e; }
        .__kami_msg__.info { color: #666; }
        .__kami_loading__ {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #fff;
          border-top-color: transparent;
          border-radius: 50%;
          animation: __kami_spin__ 0.6s linear infinite;
          vertical-align: middle;
          margin-right: 6px;
        }
        @keyframes __kami_spin__ {
          to { transform: rotate(360deg); }
        }
      </style>
      <div class="__kami_card__">
        <div class="__kami_icon__">🔐</div>
        <h2 class="__kami_title__">请输入卡密</h2>
        <p class="__kami_sub__">输入您的访问卡密<br>每个卡密仅限一个设备使用</p>
        <input type="text" class="__kami_input__" id="__kami_key__"
          placeholder="请输入卡密" maxlength="32" autocomplete="off" spellcheck="false" />
        <button class="__kami_btn__" id="__kami_submit__">验证</button>
        <div class="__kami_msg__" id="__kami_msg__"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    // 事件绑定
    const input = document.getElementById('__kami_key__');
    const btn = document.getElementById('__kami_submit__');
    const msg = document.getElementById('__kami_msg__');

    btn.addEventListener('click', handleVerify);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleVerify();
    });

    // 自动 focus
    setTimeout(() => input.focus(), 100);

    async function handleVerify() {
      const key = input.value.trim();
      if (!key) {
        showMsg('请输入卡密', 'err');
        input.classList.add('error');
        setTimeout(() => input.classList.remove('error'), 400);
        return;
      }

      btn.disabled = true;
      showMsg('正在验证...', 'info');

      try {
        const fingerprint = await window.__kami.getFingerprint();
        const deviceId = window.__kami.getDeviceId();

        const res = await fetch(VERIFY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, fingerprint, deviceId }),
        });

        const data = await res.json();

        if (data.ok) {
          localStorage.setItem(STORAGE_KEY, '1');
          localStorage.setItem('__kami_device_id__', deviceId);
          showMsg('✅ 验证成功，正在进入...', 'ok');
          btn.textContent = '验证成功！';
          setTimeout(() => {
            overlay.classList.add('hidden');
            setTimeout(() => overlay.remove(), 300);
          }, 800);
        } else {
          showMsg(data.error || '卡密无效', 'err');
          input.classList.add('error');
          setTimeout(() => input.classList.remove('error'), 400);
          btn.disabled = false;
        }
      } catch (err) {
        showMsg('网络错误，请检查网络后重试', 'err');
        btn.disabled = false;
      }
    }

    function showMsg(text, type) {
      msg.textContent = text;
      msg.className = '__kami_msg__ ' + type;
    }
  }

  // 初始化
  function init() {
    if (isVerified()) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderUI);
    } else {
      renderUI();
    }
  }

  window.__kamiVerify = { init, isVerified };
  init();
})();