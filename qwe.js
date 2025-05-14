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
