// js/edit-mode.js
// This script is injected into the client site to enable point-and-click editing.
// It outlines elements on hover and prompts for changes on click.

(function initVisualEditor() {
  if (window.__kollektivEditorInitialized) return;
  window.__kollektivEditorInitialized = true;

  let isEditModeEnabled = !window.__kollektivAdminDisableEdit; // Enabled by default when injected, unless turned off directly
  const storedRequests = JSON.parse(localStorage.getItem('kollektiv_requests') || '[]');

  // Setup styles for overlays
  const style = document.createElement('style');
  style.innerHTML = `
    .kollektiv-hover-outline {
      outline: 2px dashed #4f46e5 !important;
      outline-offset: 2px !important;
      cursor: crosshair !important;
      background-color: rgba(79, 70, 229, 0.1) !important;
      transition: all 0.1s ease-in-out !important;
    }
    
    .kollektiv-requested-overlay {
      position: relative !important;
    }

    /* Phase 1: White background with text saying change requested */
    .kollektiv-phase1 {
      position: relative !important;
      color: transparent !important;
    }
    .kollektiv-phase1::before {
      content: 'Change Requested';
      position: absolute;
      inset: 0;
      background: white;
      color: #333;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      font-family: sans-serif;
      z-index: 9998;
      border: 1px solid #ccc;
    }

    /* Phase 2: Original element with dark translucent overlay saying change requested */
    .kollektiv-phase2 {
      position: relative !important;
    }
    .kollektiv-phase2::after {
      content: 'Change Requested';
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 12px;
      font-family: sans-serif;
      z-index: 9998;
      pointer-events: none;
    }

    /* Hover tooltips */
    .kollektiv-tooltip {
      position: absolute;
      background: #111827;
      color: white;
      border-radius: 8px;
      padding: 8px 12px;
      font-family: sans-serif;
      font-size: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      white-space: pre-wrap;
      width: max-content;
      max-width: 250px;
      left: 50%;
      transform: translateX(-50%);
    }
    .kollektiv-requested-overlay:hover .kollektiv-tooltip {
      opacity: 1;
    }
    .kollektiv-tooltip.top {
      bottom: calc(100% + 5px);
    }
    .kollektiv-tooltip.bottom {
      top: calc(100% + 5px);
    }
    
    #kollektiv-inline-popup {
      position: absolute;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 12px;
      padding: 8px 14px;
      box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #kollektiv-inline-popup input[type="text"] {
      background: transparent;
      border: none;
      color: white;
      font-size: 14px;
      outline: none;
      width: 220px;
    }
    #kollektiv-inline-popup input[type="text"]::placeholder {
      color: #94a3b8;
    }
    .kollektiv-file-btn {
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .kollektiv-file-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
    .kollektiv-file-btn.has-file {
      color: #10b981;
    }
    
    #kollektiv-editor-ui { display: none; }
  `;
  document.head.appendChild(style);

  // Restore previous requests visually
  function renderOverlays() {
    // Remove old ones
    document.querySelectorAll('.kollektiv-tooltip').forEach(e => e.remove());
    document.querySelectorAll('.kollektiv-requested-overlay').forEach(e => {
      e.classList.remove('kollektiv-requested-overlay', 'kollektiv-phase2');
    });

    if (!isEditModeEnabled) return;

    storedRequests.forEach(req => {
      try {
        const el = document.querySelector(req.selector);
        if (el && !el.classList.contains('kollektiv-phase1')) { // don't override if in phase 1
          el.classList.add('kollektiv-requested-overlay', 'kollektiv-phase2');
          
          let tooltip = el.querySelector('.kollektiv-tooltip');
          if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'kollektiv-tooltip bottom'; // Default to bottom
            el.appendChild(tooltip);
          }
          tooltip.innerHTML = `<strong style="color:#60a5fa">[${req.status}]</strong><br/>${req.text}`;
        }
      } catch(e) {}
    });
  }

  // Initial render when the DOM is fully loaded or right now if it already is
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderOverlays);
  } else {
    renderOverlays();
  }

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'KOLLEKTIV_HIGHLIGHT_ELEMENT') {
      const selector = e.data.payload.selector;
      let attempts = 0;
      const interval = setInterval(() => {
        let el = null;
        try { el = document.querySelector(selector); } catch(err) {}
        if (!el) {
          try { el = document.getElementById(selector); } catch(err) {}
        }
        
        if (el) {
          clearInterval(interval);
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.outline = '4px solid #ef4444'; // Red!
          el.style.outlineOffset = '4px';
          el.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
        } else if (attempts > 30) {
          clearInterval(interval);
        }
        attempts++;
      }, 200);
    }
    
    if (e.data && e.data.type === 'KOLLEKTIV_TOGGLE_EDIT_MODE') {
      isEditModeEnabled = e.data.payload.enabled;
      renderOverlays();
      if (hoveredEl) {
        hoveredEl.classList.remove('kollektiv-hover-outline');
        hoveredEl = null;
      }
      const popup = document.getElementById('kollektiv-inline-popup');
      if (popup) popup.remove();
    }
    
    if (e.data && e.data.type === 'KOLLEKTIV_LOCAL_OVERLAY_SYNC') {
      const { selector, status, text, id } = e.data.payload;
      
      const newReq = { id, selector, status, text };
      const idx = storedRequests.findIndex(r => r.selector === selector);
      if(idx > -1) storedRequests[idx] = newReq;
      else storedRequests.push(newReq);
      
      localStorage.setItem('kollektiv_requests', JSON.stringify(storedRequests));
      
      try {
        const el = document.querySelector(selector);
        if (el) {
          el.classList.add('kollektiv-phase1');
          
          setTimeout(() => {
            el.classList.remove('kollektiv-phase1');
            renderOverlays();
          }, 5000);
        } else {
          renderOverlays();
        }
      } catch (err) {
        renderOverlays();
      }
    }
  });

  let hoveredEl = null;
  let isLocked = false;

  document.addEventListener('mouseover', (e) => {
    if (!isEditModeEnabled || isLocked) return;
    const ignoredTags = ['BODY', 'HTML', 'SCRIPT', 'STYLE'];
    if (ignoredTags.includes(e.target.tagName)) return;
    
    if (hoveredEl) {
      hoveredEl.classList.remove('kollektiv-hover-outline');
    }
    hoveredEl = e.target;
    hoveredEl.classList.add('kollektiv-hover-outline');
  });

  document.addEventListener('mouseout', (e) => {
    if (!isEditModeEnabled || isLocked) return;
    if (hoveredEl) {
      hoveredEl.classList.remove('kollektiv-hover-outline');
      hoveredEl = null;
    }
  });

  // Helper to generate a somewhat unique CSS selector for the element
  function generateSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(' ').filter(c => c && !c.includes('kollektiv')).join('.');
      if (classes) return `${el.tagName.toLowerCase()}.${classes}`;
    }
    
    // Fallback: Path from body
    let path = [];
    let currentEl = el;
    while (currentEl && currentEl.tagName !== 'BODY') {
      let selector = currentEl.tagName.toLowerCase();
      let sibling = currentEl;
      let nth = 1;
      while (sibling.previousElementSibling) {
        sibling = sibling.previousElementSibling;
        if (sibling.tagName === currentEl.tagName) nth++;
      }
      selector += `:nth-of-type(${nth})`;
      path.unshift(selector);
      currentEl = currentEl.parentElement;
    }
    return 'body > ' + path.join(' > ');
  }

  document.addEventListener('click', (e) => {
    if (!isEditModeEnabled) return;
    
    // Ignore internal popup clicks
    if (e.target.closest('#kollektiv-inline-popup')) return;

    if (isLocked) {
      // User clicked outside the locked element and popup
      isLocked = false;
      if (hoveredEl) hoveredEl.classList.remove('kollektiv-hover-outline');
      const existing = document.getElementById('kollektiv-inline-popup');
      if (existing) existing.remove();
      return;
    }

    const ignoredTags = ['BODY', 'HTML', 'SCRIPT', 'STYLE'];
    if (ignoredTags.includes(e.target.tagName)) return;

    e.preventDefault();
    e.stopPropagation();

    // Was it an existing overlay badge?
    let target = e.target;
    if (target.classList.contains('kollektiv-overlay-badge') || target.closest('.kollektiv-overlay-badge')) {
      target = target.closest('.kollektiv-requested-overlay');
      if (!target) return;
    }

    if (target.classList.contains('kollektiv-phase1') || target.classList.contains('kollektiv-phase2')) {
      return; // Already requested
    }

    // Clean up existing popups
    const existing = document.getElementById('kollektiv-inline-popup');
    if (existing) existing.remove();
    
    // Lock the outline
    isLocked = true;
    hoveredEl = target;

    const selector = generateSelector(target);
    const originalTextRaw = target.innerText.replace(/Status:.*\n.*$/, '').trim() || '[Image/Non-text]';

    const rect = target.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    
    const pageW = document.documentElement.scrollWidth;
    const pageH = document.documentElement.scrollHeight;
    const pX = pageW ? ((rect.left + scrollX) / pageW * 100).toFixed(1) + '%' : '0%';
    const pY = pageH ? ((rect.top + scrollY) / pageH * 100).toFixed(1) + '%' : '0%';
    
    const metadata = "\\n--- Element Properties ---\\n" + 
      "Tag: " + target.tagName.toLowerCase() + (target.id ? '#' + target.id : '') + (target.className && typeof target.className === 'string' ? '.' + target.className.split(' ').filter(c => c && !c.includes('kollektiv')).join('.') : '') + "\\n" +
      "Dimensions: " + Math.round(rect.width) + "x" + Math.round(rect.height) + " px\\n" +
      "Location: Down " + pY + ", Right " + pX + "\\n" +
      "Page Size: " + pageW + "x" + pageH + " px\\n" +
      "URL: " + window.location.href;
    
    const originalText = originalTextRaw + metadata;

    const popup = document.createElement('div');
    popup.id = 'kollektiv-inline-popup';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Describe change & hit Enter';
    
    const fileLabel = document.createElement('label');
    fileLabel.className = 'kollektiv-file-btn';
    fileLabel.title = 'Attach Image';
    fileLabel.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><input type="file" accept="image/*" style="display:none;" />';
    
    const fileInput = fileLabel.querySelector('input');
    let attachedFileDataUrl = null;
    let attachedFileName = null;
    
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        attachedFileName = file.name;
        const reader = new FileReader();
        reader.onload = (ev) => {
          attachedFileDataUrl = ev.target.result;
          fileLabel.className = 'kollektiv-file-btn has-file';
        };
        reader.readAsDataURL(file);
      }
    });

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        const text = input.value.trim();
        if (!text && !attachedFileDataUrl) return;
        
        isLocked = false;
        target.classList.remove('kollektiv-hover-outline');
        hoveredEl = null;

        popup.remove();
        
        // Phase 1 locally
        target.classList.add('kollektiv-phase1');
        
        let payloadImage = null;
        if (attachedFileDataUrl) {
            payloadImage = { name: attachedFileName, dataUrl: attachedFileDataUrl };
        }
        
        // Post direct request submission to dashboard without UI
        window.parent.postMessage({
          type: 'KOLLEKTIV_SUBMIT_REQUEST',
          payload: {
            selector: selector,
            originalText: originalText,
            newText: text || '[See Attached Image]',
            image: payloadImage
          }
        }, '*');

        // Simulate network processing until parent echoes back KOLLEKTIV_LOCAL_OVERLAY_SYNC
        // But if parent doesn't echo within 5 seconds for some reason, we manually trigger Phase 2.
        setTimeout(() => {
          if (target.classList.contains('kollektiv-phase1')) {
            target.classList.remove('kollektiv-phase1');
            target.classList.add('kollektiv-phase2');
            
            const tooltip = document.createElement('div');
            tooltip.className = 'kollektiv-tooltip bottom';
            tooltip.innerHTML = "<strong style='color:#60a5fa'>[Requested]</strong><br/>" + (text || '[Image Attached]');
            target.appendChild(tooltip);
          }
        }, 5000);
      }
    });

    popup.appendChild(input);
    popup.appendChild(fileLabel);
    document.body.appendChild(popup);
    
    // Position vertically center edge (above or below) and horizontally center
    let topPos = rect.bottom + scrollY + 12;
    if (topPos + 45 > window.innerHeight + scrollY) {
      topPos = rect.top + scrollY - 45; // Above if not enough space below
    }
    
    popup.style.top = topPos + 'px';
    popup.style.left = (rect.left + scrollX + (rect.width / 2)) + 'px';
    // Offset standard transform for horizontal centering
    popup.style.transform = 'translateX(-50%)';
    
    setTimeout(() => input.focus(), 10);
  });

  console.log('Kollektiv Visual Editor Initialized (Inline UI Edition)');
})();