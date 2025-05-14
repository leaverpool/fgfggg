// --- Timestamp Overlay Functions ---
function updateOldestTimestampButton() {
  const overlay = timestampOverlayElement; if (!overlay) return;
  const button = overlay.querySelector('#oldest-timestamp-button'); if (!button) return;
  try {
    let visibleTimestampedCount = 0, oldestTimestamp = Infinity;
    document.querySelectorAll(CHAT_TAB_SELECTOR_ALL).forEach(tab => {
      if (!tab.isConnected) return;
      const chatId = getChatIdFromTab(tab);
      const timestamp = scriptChatCounts[chatId]?.firstUnreadTimestamp;
      if (chatId && timestamp > 0) { visibleTimestampedCount++; if(timestamp < oldestTimestamp) oldestTimestamp = timestamp; }
    });
    button.textContent = `Go to Oldest (${visibleTimestampedCount}) ${oldestTimestamp === Infinity ? '' : formatTimestamp(oldestTimestamp)}. Click to navigate.`;
    button.disabled = false;
  } catch(e) { logEvent('ERROR', 'Error updating oldest timestamp button', e); if(button) { button.textContent = 'Error updating'; button.disabled = false; } }
}
function goToOldestTimestampedChat() {
  logEvent('INFO', '[GoToOldest] Go to Oldest button clicked.');
  try {
    const visibleTimestampedChats = [];
    document.querySelectorAll(CHAT_TAB_SELECTOR_ALL).forEach(tab => { if (!tab.isConnected) return; const chatId = getChatIdFromTab(tab); const timestamp = scriptChatCounts[chatId]?.firstUnreadTimestamp; if (chatId && timestamp !== null && timestamp > 0) { visibleTimestampedChats.push({ chatId, timestamp, element: tab }); } });
    let targetElement = null; let targetChatId = null;
    if (visibleTimestampedChats.length > 0) { visibleTimestampedChats.sort((a, b) => a.timestamp - b.timestamp); targetChatId = visibleTimestampedChats[0].chatId; targetElement = visibleTimestampedChats[0].element; logEvent('INFO', `[GoToOldest] Found ${visibleTimestampedChats.length} visible timestamped chats. Oldest: ${targetChatId} @ ${new Date(visibleTimestampedChats[0].timestamp).toLocaleTimeString()}`);
    } else { logEvent('INFO', '[GoToOldest] No visible timestamped chats found. Falling back to NOC chat.'); targetChatId = NOC_CHAT_ID; document.querySelectorAll(CHAT_TAB_SELECTOR_ALL).forEach(tab => { const currentTabId = getChatIdFromTab(tab); if (currentTabId === NOC_CHAT_ID) { targetElement = tab; logEvent('INFO', `[GoToOldest] Found NOC chat element by ID:`, targetElement); } }); }
    if (targetElement) { logEvent('INFO', `[GoToOldest] Activating and scrolling to target chat: ${targetChatId}.`); targetElement.style.outline="3px solid blue"; setTimeout(() => {if(targetElement)targetElement.style.outline="";}, 2000);
      setTimeout(() => { if (targetElement && targetElement.isConnected) { if(typeof targetElement.click==='function'){targetElement.click();} targetElement.scrollIntoView({behavior:'smooth',block:'center'}); } else { logEvent('WARN', '[GoToOldest] Target tab disconnected.'); } }, 100);
    } else { logEvent('WARN', `[GoToOldest] Could not find DOM element for target chat ID: ${targetChatId || 'N/A'}`); }
  } catch (e) { logEvent('ERROR', '[GoToOldest] Error in goToOldestTimestampedChat', e); }
}
async function createTimestampOverlay() {
  logEvent('INFO', 'Creating timestamp info overlay...'); if (document.getElementById('timestamp-overlay')) return;
  try {
    timestampOverlayElement = document.createElement('div'); timestampOverlayElement.id = 'timestamp-overlay';
    const [savedX,savedY,savedW,savedH] = await Promise.all([GM_getValue(OVERLAY_POS_X_KEY,'10px'),GM_getValue(OVERLAY_POS_Y_KEY,'230px'),GM_getValue(OVERLAY_SIZE_W_KEY,overlayMinWidth),GM_getValue(OVERLAY_SIZE_H_KEY,overlayMinHeight)]);
    Object.assign(timestampOverlayElement.style, {left:savedX, top:savedY, width:savedW, height:savedH});
    const button = document.createElement('button'); button.id = 'oldest-timestamp-button'; button.textContent='Go to Oldest (0)'; button.title='Navigate to oldest script unread or NOC chat.';
    button.addEventListener('click', goToOldestTimestampedChat); timestampOverlayElement.appendChild(button);
    document.body.appendChild(timestampOverlayElement); makeOverlayDraggable(timestampOverlayElement);
    if(typeof ResizeObserver==='function'){ if(!debouncedSaveOverlaySize){const saveSize=async(entry)=>{const target=entry.target;if(!target)return;try{await GM_setValue(OVERLAY_SIZE_W_KEY,target.style.width);await GM_setValue(OVERLAY_SIZE_H_KEY,target.style.height);}catch(err){}};debouncedSaveOverlaySize=typeof _!=='undefined'&&typeof _.debounce==='function'?_.debounce(saveSize,RESIZE_DEBOUNCE_MS):simpleDebounce(saveSize,RESIZE_DEBOUNCE_MS);} new ResizeObserver(entries=>{for(let entry of entries)if(debouncedSaveOverlaySize)debouncedSaveOverlaySize(entry);}).observe(timestampOverlayElement);
    } else { logEvent('WARN', 'ResizeObserver not available.'); } updateOldestTimestampButton();
  } catch (error) { logEvent('ERROR', 'Failed to create timestamp overlay', error); timestampOverlayElement = null; }
}
function makeOverlayDraggable(overlay) {
  let offsetX, offsetY, isDragging = false; const MOUSE_DOWN_TARGET_SELECTOR = `#${overlay.id}`; const RESIZE_CORNER_THRESHOLD = 15;
  try {
    overlay.addEventListener('mousedown', async (e) => {
      if (e.target.closest('button'))return; const cS=getComputedStyle(e.target).cursor; if(cS.includes('resize')||cS.includes('resizer'))return; const r=overlay.getBoundingClientRect(); if(e.clientY>=r.bottom-RESIZE_CORNER_THRESHOLD&&e.clientX>=r.right-RESIZE_CORNER_THRESHOLD)return; if(!e.target.matches(MOUSE_DOWN_TARGET_SELECTOR)&&!overlay.contains(e.target))return;
      isDragging=true;offsetX=e.clientX-overlay.offsetLeft;offsetY=e.clientY-overlay.offsetTop;overlay.style.cursor='grabbing';overlay.style.userSelect='none';
    });
    document.addEventListener('mousemove',(e)=>{if(!isDragging)return;let nX=e.clientX-offsetX,nY=e.clientY-offsetY;const mX=window.innerWidth-overlay.offsetWidth,mY=window.innerHeight-overlay.offsetHeight;overlay.style.left=`${Math.max(0,Math.min(nX,mX))}px`;overlay.style.top=`${Math.max(0,Math.min(nY,mY))}px`;});
    document.addEventListener('mouseup',async()=>{if(isDragging){isDragging=false;overlay.style.cursor='grab';overlay.style.userSelect='';try{await GM_setValue(OVERLAY_POS_X_KEY,overlay.style.left);await GM_setValue(OVERLAY_POS_Y_KEY,overlay.style.top);}catch(err){logEvent('ERROR','Draggable: Failed to save overlay position',err);}}else if(overlay.style.cursor!=='grab')overlay.style.cursor='grab';});
    overlay.style.cursor='grab';
  } catch (e) { logEvent('ERROR', 'Error setting up overlay dragging', e); }
}
