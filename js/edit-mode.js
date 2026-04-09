// js/edit-mode.js
// This script is injected into the client site to enable point-and-click editing.
// It outlines elements on hover and prompts for changes on click.

(function initVisualEditor() {
  if (window.__BauFurWebEditorInitialized) return;
  window.__BauFurWebEditorInitialized = true;

  let isEditModeEnabled = !window.__BauFurWebAdminDisableEdit; // Enabled by default when injected, unless turned off directly
  const storedRequests = JSON.parse(localStorage.getItem('Bau.FurWeb_requests') || '[]');

  // Setup styles for overlays
  const style = document.createElement('style');
  style.innerHTML = `
    .Bau.FurWeb-hover-outline {
      outline: 2px dashed #4f46e5 !important;
      outline-offset: 2px !important;
      cursor: crosshair !important;
      background-color: rgba(79, 70, 229, 0.1) !important;
      transition: all 0.1s ease-in-out !important;
    }
    
    .Bau.FurWeb-requested-overlay {
      position: relative !important;
    }

    /* Phase 1: White background with text saying change requested */
    .Bau.FurWeb-phase1 {
      position: relative !important;
      color: transparent !important;
    }
    .Bau.FurWeb-phase1::before {
      content: 'Änderung angefragt';
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
    .Bau.FurWeb-phase2 {
      position: relative !important;
    }
    .Bau.FurWeb-phase2::after {
      content: 'Änderung angefragt';
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
    .Bau.FurWeb-tooltip {
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
    .Bau.FurWeb-requested-overlay:hover .Bau.FurWeb-tooltip {
      opacity: 1;
    }
    .Bau.FurWeb-tooltip.top {
      bottom: calc(100% + 5px);
    }
    .Bau.FurWeb-tooltip.bottom {
      top: calc(100% + 5px);
    }
    
    #Bau.FurWeb-inline-popup {
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
    #Bau.FurWeb-inline-popup input[type="text"] {
      background: transparent;
      border: none;
      color: white;
      font-size: 14px;
      outline: none;
      width: 220px;
    }
    #Bau.FurWeb-inline-popup input[type="text"]::placeholder {
      color: #94a3b8;
    }
    .Bau.FurWeb-file-btn {
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .Bau.FurWeb-file-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
    .Bau.FurWeb-file-btn.has-file {
      color: #10b981;
    }
    
    #Bau.FurWeb-editor-ui { display: none; }
  `;
  document.head.appendChild(style);

  // Restore previous requests visually
  function renderOverlays() {
    // Remove old ones
    document.querySelectorAll('.Bau.FurWeb-tooltip').forEach(e => e.remove());
    document.querySelectorAll('.Bau.FurWeb-requested-overlay').forEach(e => {
      e.classList.remove('Bau.FurWeb-requested-overlay', 'Bau.FurWeb-phase2');
    });

    if (!isEditModeEnabled) return;

    storedRequests.forEach(req => {
      try {
        const el = document.querySelector(req.selector);
        if (el && !el.classList.contains('Bau.FurWeb-phase1')) { // don't override if in phase 1
          el.classList.add('Bau.FurWeb-requested-overlay', 'Bau.FurWeb-phase2');
          
          let tooltip = el.querySelector('.Bau.FurWeb-tooltip');
          if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'Bau.FurWeb-tooltip bottom'; // Default to bottom
            el.appendChild(tooltip);
          }
          const statusDE = { 'Pending': 'Ausstehend', 'Done': 'Erledigt', 'Requested': 'Angefragt' };
          let translatedStatus = statusDE[req.status] || req.status;
          tooltip.innerHTML = `<strong style="color:#60a5fa">[${translatedStatus}]</strong><br/>${req.text}`;
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
    if (e.data && e.data.type === 'Bau.FurWeb_HIGHLIGHT_ELEMENT') {
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
    
    if (e.data && e.data.type === 'Bau.FurWeb_TOGGLE_EDIT_MODE') {
      isEditModeEnabled = e.data.payload.enabled;
      renderOverlays();
      if (hoveredEl) {
        hoveredEl.classList.remove('Bau.FurWeb-hover-outline');
        hoveredEl = null;
      }
      const popup = document.getElementById('Bau.FurWeb-inline-popup');
      if (popup) popup.remove();
    }
    
    if (e.data && e.data.type === 'Bau.FurWeb_LOCAL_OVERLAY_SYNC') {
      const { selector, status, text, id } = e.data.payload;
      
      const newReq = { id, selector, status, text };
      const idx = storedRequests.findIndex(r => r.selector === selector);
      if(idx > -1) storedRequests[idx] = newReq;
      else storedRequests.push(newReq);
      
      localStorage.setItem('Bau.FurWeb_requests', JSON.stringify(storedRequests));
      
      try {
        const el = document.querySelector(selector);
        if (el) {
          el.classList.add('Bau.FurWeb-phase1');
          
          setTimeout(() => {
            el.classList.remove('Bau.FurWeb-phase1');
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
      hoveredEl.classList.remove('Bau.FurWeb-hover-outline');
    }
    hoveredEl = e.target;
    hoveredEl.classList.add('Bau.FurWeb-hover-outline');
  });

  document.addEventListener('mouseout', (e) => {
    if (!isEditModeEnabled || isLocked) return;
    if (hoveredEl) {
      hoveredEl.classList.remove('Bau.FurWeb-hover-outline');
      hoveredEl = null;
    }
  });

  // Helper to generate a somewhat unique CSS selector for the element
  function generateSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(' ').filter(c => c && !c.includes('Bau.FurWeb')).join('.');
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
    if (e.target.closest('#Bau.FurWeb-inline-popup')) return;

    if (isLocked) {
      // User clicked outside the locked element and popup
      isLocked = false;
      if (hoveredEl) hoveredEl.classList.remove('Bau.FurWeb-hover-outline');
      const existing = document.getElementById('Bau.FurWeb-inline-popup');
      if (existing) existing.remove();
      return;
    }

    const ignoredTags = ['BODY', 'HTML', 'SCRIPT', 'STYLE'];
    if (ignoredTags.includes(e.target.tagName)) return;

    e.preventDefault();
    e.stopPropagation();

    // Was it an existing overlay badge?
    let target = e.target;
    if (target.classList.contains('Bau.FurWeb-overlay-badge') || target.closest('.Bau.FurWeb-overlay-badge')) {
      target = target.closest('.Bau.FurWeb-requested-overlay');
      if (!target) return;
    }

    if (target.classList.contains('Bau.FurWeb-phase1') || target.classList.contains('Bau.FurWeb-phase2')) {
      return; // Already requested
    }

    // Clean up existing popups
    const existing = document.getElementById('Bau.FurWeb-inline-popup');
    if (existing) existing.remove();
    
    // Lock the outline
    isLocked = true;
    hoveredEl = target;

    const selector = generateSelector(target);
    const originalTextRaw = target.innerText.replace(/Status:.*\n.*$/, '').trim() || '[Bild/Kein Text]';

    const rect = target.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    
    const pageW = document.documentElement.scrollWidth;
    const pageH = document.documentElement.scrollHeight;
    const pX = pageW ? ((rect.left + scrollX) / pageW * 100).toFixed(1) + '%' : '0%';
    const pY = pageH ? ((rect.top + scrollY) / pageH * 100).toFixed(1) + '%' : '0%';
    
    const metadata = "\\n--- Element-Eigenschaften ---\\n" + 
      "Tag: " + target.tagName.toLowerCase() + (target.id ? '#' + target.id : '') + (target.className && typeof target.className === 'string' ? '.' + target.className.split(' ').filter(c => c && !c.includes('Bau.FurWeb')).join('.') : '') + "\\n" +
      "Abmessungen: " + Math.round(rect.width) + "x" + Math.round(rect.height) + " px\\n" +
      "Position: Unten " + pY + ", Rechts " + pX + "\\n" +
      "Seitengröße: " + pageW + "x" + pageH + " px\\n" +
      "URL: " + window.location.href;
    
    const originalText = originalTextRaw + metadata;

    const popup = document.createElement('div');
    popup.id = 'Bau.FurWeb-inline-popup';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Änderung beschreiben & Enter drücken';
    
    const fileLabel = document.createElement('label');
    fileLabel.className = 'Bau.FurWeb-file-btn';
    fileLabel.title = 'Bild anhängen';
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
          fileLabel.className = 'Bau.FurWeb-file-btn has-file';
        };
        reader.readAsDataURL(file);
      }
    });

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        const text = input.value.trim();
        if (!text && !attachedFileDataUrl) return;
        
        isLocked = false;
        target.classList.remove('Bau.FurWeb-hover-outline');
        hoveredEl = null;

        popup.remove();
        
        // Phase 1 locally
        target.classList.add('Bau.FurWeb-phase1');
        
        let payloadImage = null;
        if (attachedFileDataUrl) {
            payloadImage = { name: attachedFileName, dataUrl: attachedFileDataUrl };
        }
        
        // Post direct request submission to dashboard without UI
        window.parent.postMessage({
          type: 'Bau.FurWeb_SUBMIT_REQUEST',
          payload: {
            selector: selector,
            originalText: originalText,
            newText: text || '[Siehe angehängtes Bild]',
            image: payloadImage
          }
        }, '*');

        // Simulate network processing until parent echoes back Bau.FurWeb_LOCAL_OVERLAY_SYNC
        // But if parent doesn't echo within 5 seconds for some reason, we manually trigger Phase 2.
        setTimeout(() => {
          if (target.classList.contains('Bau.FurWeb-phase1')) {
            target.classList.remove('Bau.FurWeb-phase1');
            target.classList.add('Bau.FurWeb-phase2');
            
            const tooltip = document.createElement('div');
            tooltip.className = 'Bau.FurWeb-tooltip bottom';
            tooltip.innerHTML = "<strong style='color:#60a5fa'>[Angefragt]</strong><br/>" + (text || '[Bild angehängt]');
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

  console.log('Bau.FurWeb Visual Editor initialisiert (Inline UI Edition)');
})();