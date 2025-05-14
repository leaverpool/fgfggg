// --- Constants and Configuration ---
const SCRIPT_ID = 'RC-Combo-v6-5-15-debug-log-filter';
const CC_CONSOLE_LOG_LEVEL = 'DEBUG'; // Set to 'DEBUG' for more verbose console logs
const MAX_CHAT_RECORDS = 100;
const RECENTLY_READ_THRESHOLD_MS = 1500;

const SCRIPT_BADGE_COLOR = '#8A2BE2';
const IGNORED_BADGE_COLOR = '#6c757d';
const TOTAL_BADGE_COLOR = '#DC3545';
const NATIVE_BADGE_COLOR = '#F9A825';
const TIMESTAMP_BADGE_COLOR = '#28a745';
const ELAPSED_BADGE_COLOR = '#4a4a4a';
const CC_STORAGE_PREFIX = 'chatCounterCore_gm_';
const CC_STORAGE_COUNTS = CC_STORAGE_PREFIX + 'counts_v6_3';
const UI_VIS_PREFIX = 'ui_visibility_';
const VIS_NATIVE_KEY = UI_VIS_PREFIX + 'native';
const VIS_SCRIPT_KEY = UI_VIS_PREFIX + 'script';
const VIS_TIMESTAMP_KEY = UI_VIS_PREFIX + 'timestamp';
const VIS_ELAPSED_KEY = UI_VIS_PREFIX + 'elapsed';
const VIS_IGNORED_KEY = UI_VIS_PREFIX + 'ignored_v1';
const VIS_TOTAL_KEY = UI_VIS_PREFIX + 'total_v1';
const OVERLAY_POS_X_KEY = 'timestampOverlay_posX';
const OVERLAY_POS_Y_KEY = 'timestampOverlay_posY';
const SORTER_COLLAPSED_KEY = 'sorter_ui_collapsed_v2';
const OVERLAY_SIZE_W_KEY = 'timestampOverlay_sizeW_v1';
const OVERLAY_SIZE_H_KEY = 'timestampOverlay_sizeH_v1';
const RESIZE_DEBOUNCE_MS = 500;
const CC_INJECTED_COUNTER_CLASS = 'rc-combo-injected-counter';
const CC_TIMESTAMP_BADGE_CLASS = 'rc-combo-timestamp-badge';
const CC_ELAPSED_BADGE_CLASS = 'rc-combo-elapsed-badge';
const CC_IGNORED_BADGE_CLASS = 'rc-combo-ignored-badge';
const CC_TOTAL_BADGE_CLASS = 'rc-combo-total-badge';
const CC_BADGE_CONTAINER_CLASS = 'rc-combo-badge-container';
const CC_MARK_ALL_READ_BUTTON_CLASS = 'rc-combo-mark-all-read-button';
const CC_CLEAR_STORAGE_BUTTON_CLASS = 'rc-combo-clear-storage-button';
const HIDE_CLASS_NATIVE = 'rc-combo-hide-native';
const HIDE_CLASS_SCRIPT = 'rc-combo-hide-script';
const HIDE_CLASS_TIMESTAMP = 'rc-combo-hide-timestamp';
const HIDE_CLASS_ELAPSED = 'rc-combo-hide-elapsed';
const HIDE_CLASS_IGNORED = 'rc-combo-hide-ignored';
const HIDE_CLASS_TOTAL = 'rc-combo-hide-total';
const LABEL_SPAN_ID_NATIVE = 'label-span-native';
const LABEL_SPAN_ID_UNIGNORED = 'label-span-unignored';
const LABEL_SPAN_ID_IGNORED = 'label-span-ignored';
const LABEL_SPAN_ID_TIMESTAMP = 'label-span-timestamp';
const LABEL_SPAN_ID_ELAPSED = 'label-span-elapsed';
const LABEL_SPAN_ID_TOTAL = 'label-span-total';
const ELAPSED_UPDATE_INTERVAL_MS = 60 * 1000;
const TIMESTAMP_OVERLAY_UPDATE_INTERVAL_MS = 10 * 1000;

const OBSERVER_TARGET_SELECTOR = 'div[class^="index_chat-list-content-left__"]';
const CLICK_LISTENER_TARGET_SELECTOR = OBSERVER_TARGET_SELECTOR;
const CHAT_TAB_SELECTOR_ALL = 'div[class^="index_chat-list-tab__"]:not([class*="index_chat-list-tab-add__"])';
const NOC_CHAT_CLASS_PART = "index_chat-list-tab-noc__";
const NOC_CHAT_ID = "noc-moderated";
const ACTIVE_CHAT_TAB_SELECTOR = 'div[class*="index_chat-list-tab-active__"]';
const UNREAD_COUNT_SELECTOR = 'div[class^="index_chat-list-unread-count__"]';
const LAST_MESSAGE_CONTAINER_SELECTOR = 'div[class^="index_chat-list-last-message__"]';
const CHAT_TITLE_CONTAINER_SELECTOR = ':scope > div:first-child';
const CHAT_TITLE_CMR_LINK_SELECTOR = 'a[href*="/requests/"]';
const CHAT_TITLE_DESC_SPAN_SELECTOR = 'span';
const STATUS_ICON_SELECTOR = 'div[class^="index_tabStatusIcon__"] span.anticon';
const TITLE_SELECTOR = 'a';

const CUSTOM_PREVIEW_CLASS = 'rc-combo-custom-last-message';



const ALL_GM_STORAGE_KEYS = [ CC_STORAGE_COUNTS, VIS_NATIVE_KEY, VIS_SCRIPT_KEY, VIS_TIMESTAMP_KEY, VIS_ELAPSED_KEY, VIS_IGNORED_KEY, VIS_TOTAL_KEY, OVERLAY_POS_X_KEY, OVERLAY_POS_Y_KEY, SORTER_COLLAPSED_KEY, OVERLAY_SIZE_W_KEY, OVERLAY_SIZE_H_KEY ];

// --- Debug Overlay Constants ---
const DEBUG_OVERLAY_ID = 'rc-combo-debug-overlay';
const DEBUG_LOG_CONTAINER_ID = 'rc-combo-debug-log-container';
const MAX_DEBUG_LOG_ENTRIES = 100; // Max number of log lines in the debug overlay
const DEBUG_LOG_TEXT_SNIPPET_LENGTH = 70; // Max length for text snippets in debug log

// --- Global State ---
let scriptChatCounts = {};
let visualUpdateDebounceTimer = null;
let chatListClickListenerAdded = false;
let mainContainerElement = null;
let pageObserver = null;
let initializationScheduled = false;
let visibilityState = { native: true, script: true, timestamp: true, elapsed: true, ignored: true, total: true };
let elapsedUpdateIntervalId = null;
let timestampOverlayUpdateIntervalId = null;
let timestampOverlayElement = null;
let debouncedSaveOverlaySize = null;
const tabsToRecheck = new Map();
let debugLogContainer = null; // For the new debug overlay

// --- Logging ---
const LOG_LEVELS = { DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4, NONE: 5 };
const CURRENT_CONSOLE_LOG_LEVEL = LOG_LEVELS[CC_CONSOLE_LOG_LEVEL] || LOG_LEVELS.INFO;
function logEvent(level = 'INFO', message, data = undefined) {
  const levelNum = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  if (levelNum >= CURRENT_CONSOLE_LOG_LEVEL && level !== 'NONE') {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const scriptNamePart = (GM_info?.script?.name || SCRIPT_ID).split(' v')[0];
    const consoleArgs = [`%c[${scriptNamePart} @ ${timestamp}]%c ${message}`, 'font-weight: bold;', 'font-weight: normal;'];
    if (data !== undefined) {
      let logData = data;
      try {
        if (data instanceof Element || data instanceof Node) { logData = `<${data.tagName?.toLowerCase() || 'Node'}> Element/Node`; }
        else if (data instanceof Event) { logData = `Event: ${data.type} on ${data.target?.tagName}`; }
        else if (typeof data === 'object' && data !== null) { logData = JSON.parse(JSON.stringify(data)); }
      } catch (e) { logData = "[Unserializable/Circular Object]"; }
      consoleArgs.push(logData);
    }
    switch (level) {
      case 'WARN': console.warn(...consoleArgs); break;
      case 'ERROR': console.error(...consoleArgs); break;
      case 'INFO': console.info(...consoleArgs); break;
      case 'DEBUG': console.debug?.(...consoleArgs) || console.log(...consoleArgs); break;
      default: console.log(...consoleArgs); break;
    }
  }
}

// --- Utility Functions ---
function simpleDebounce(func, delay) { let timeout; return function(...args) { const context = this; clearTimeout(timeout); timeout = setTimeout(() => func.apply(context, args), delay); }; }
function logTimestampDecision(chatId, context, decision, reason, oldState, newStateDetails) {
  const oldTs = oldState ? (oldState.firstUnreadTimestamp ? new Date(oldState.firstUnreadTimestamp).toLocaleTimeString('en-US', { hour12: false }) : 'null') : 'N/A';
  const newTsVal = newStateDetails && newStateDetails.firstUnreadTimestamp ? new Date(newStateDetails.firstUnreadTimestamp).toLocaleTimeString('en-US', { hour12: false }) : (newStateDetails && newStateDetails.firstUnreadTimestamp === null ? 'null' : 'N/A');
  logEvent('DEBUG', `[TS_DEBUG] Chat [${chatId}] Ctx: ${context} | Decision: ${decision} | Reason: ${reason}`, {
    old_count: oldState?.count, old_ignored_count: oldState?.ignoredCount, old_timestamp: oldTs,
    old_last_text: (oldState?.lastText || "").substring(0,30) + ((oldState?.lastText || "").length > 30 ? "..." : ""),
    old_last_activity: oldState?.lastActivityTimestamp ? new Date(oldState.lastActivityTimestamp).toLocaleTimeString() : 'N/A',
    old_last_read_ts: oldState?.lastReadByScriptTimestamp ? new Date(oldState.lastReadByScriptTimestamp).toLocaleTimeString('en-US', {hour12:false, second:'2-digit', fractionalSecondDigits: 3}) : 'N/A',
    old_last_seen_dom_text: (oldState?.lastSeenDomTextBeforeRead || "").substring(0,30) + ((oldState?.lastSeenDomTextBeforeRead || "").length > 30 ? "..." : ""),
    current_text_if_applicable: newStateDetails?.currentText ? newStateDetails.currentText.replace(/\n/g, '\\n').substring(0,30) + (newStateDetails.currentText.length > 30 ? "..." : "") : "N/A",
    new_count: newStateDetails?.count, new_ignored_count: newStateDetails?.ignoredCount,
    new_total_count: newStateDetails?.totalCountSinceActive, final_timestamp_val: newTsVal,
    new_last_activity: newStateDetails?.lastActivityTimestamp ? new Date(newStateDetails.lastActivityTimestamp).toLocaleTimeString() : 'N/A',
    new_last_read_ts: newStateDetails?.lastReadByScriptTimestamp ? new Date(newStateDetails.lastReadByScriptTimestamp).toLocaleTimeString('en-US', {hour12:false, second:'2-digit', fractionalSecondDigits: 3}) : 'N/A',
    new_last_seen_dom_text: (newStateDetails?.lastSeenDomTextBeforeRead || "").replace(/\n/g, '\\n').substring(0,30) + ((newStateDetails?.lastSeenDomTextBeforeRead || "").length > 30 ? "..." : ""),
    full_old_state: oldState, full_new_details: newStateDetails
  });
}

// --- Debug Overlay Functions ---
function addDebugLogEntry(chatId, domContent, result) {
    // Filter out log entries where the DOM content (message text) is empty or whitespace-only,
    // as per user request to only show entries with actual message content in the debug overlay.
    if ((domContent || "").trim() === "") {
        return;
    }

    if (!debugLogContainer) return;

    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const logEntry = document.createElement('div');
    logEntry.className = 'rc-combo-debug-log-entry';

    // domContent is already confirmed to be non-empty (after trim) by the check above.
    // So, (domContent || "") is effectively just domContent.
    let processedDomContent = domContent.replace(/\n/g, '↵');
    if (processedDomContent.length > DEBUG_LOG_TEXT_SNIPPET_LENGTH) {
        processedDomContent = processedDomContent.substring(0, DEBUG_LOG_TEXT_SNIPPET_LENGTH) + "...";
    }

    logEntry.textContent = `[${timestamp}] - [${chatId || 'N/A'}] - "${processedDomContent}" - ${result}`;

    debugLogContainer.appendChild(logEntry);

    // Scroll to bottom
    debugLogContainer.scrollTop = debugLogContainer.scrollHeight;

    // Limit number of entries
    while (debugLogContainer.childNodes.length > MAX_DEBUG_LOG_ENTRIES) {
        debugLogContainer.removeChild(debugLogContainer.firstChild);
    }
}

function createDebugOverlay() {
    if (document.getElementById(DEBUG_OVERLAY_ID)) return;
    logEvent('INFO', 'Creating debug log overlay...');
    try {
        const overlay = document.createElement('div');
        overlay.id = DEBUG_OVERLAY_ID;

        const header = document.createElement('div');
        header.textContent = 'RC Combo Script - DOM Message Check Log (Non-Empty Only)';
        header.style.fontWeight = 'bold';
        header.style.padding = '5px';
        header.style.backgroundColor = '#333';
        header.style.color = 'white';
        header.style.borderTopLeftRadius = '5px';
        header.style.borderTopRightRadius = '5px';

        debugLogContainer = document.createElement('div');
        debugLogContainer.id = DEBUG_LOG_CONTAINER_ID;

        overlay.appendChild(header);
        overlay.appendChild(debugLogContainer);
        document.body.appendChild(overlay);
        logEvent('INFO', 'Debug log overlay created.');
    } catch (error) {
        logEvent('ERROR', 'Failed to create debug log overlay', error);
        debugLogContainer = null;
    }
}


// --- Storage ---
async function enforceRecordLimit() {
  const chatIds = Object.keys(scriptChatCounts);
  if (chatIds.length <= MAX_CHAT_RECORDS) { return false; }
  logEvent('WARN', `[RecordLimit] Record limit (${MAX_CHAT_RECORDS}) exceeded. Current: ${chatIds.length}. Pruning oldest records...`);
  let recordsPruned = 0;
  const chatsWithTimestamps = chatIds.map(id => ({ id: id, timestamp: scriptChatCounts[id]?.lastActivityTimestamp || scriptChatCounts[id]?.firstUnreadTimestamp || 0 }));
  chatsWithTimestamps.sort((a, b) => a.timestamp - b.timestamp);
  let numToDelete = chatIds.length - MAX_CHAT_RECORDS;
  for (let i = 0; i < numToDelete && i < chatsWithTimestamps.length; i++) {
    const chatToDeleteId = chatsWithTimestamps[i].id;
    if (chatToDeleteId === NOC_CHAT_ID) { logEvent('DEBUG', `[RecordLimit] Skipping deletion of NOC chat: ${chatToDeleteId}`); numToDelete++; continue; }
    logEvent('INFO', `[RecordLimit] Pruning record for chat ID: ${chatToDeleteId} (Activity/TS: ${new Date(chatsWithTimestamps[i].timestamp).toLocaleString()})`);
    delete scriptChatCounts[chatToDeleteId]; recordsPruned++;
  }
  if (recordsPruned > 0) { logEvent('INFO', `[RecordLimit] Pruned ${recordsPruned} oldest records. New count: ${Object.keys(scriptChatCounts).length}`); return true; }
  return false;
}
async function loadCounts() {
  logEvent('INFO', '--- loadCounts START ---');
  const storedData = await GM_getValue(CC_STORAGE_COUNTS, '{}');
  let parsedData; try { parsedData = JSON.parse(storedData); if (typeof parsedData !=='object'||parsedData===null) parsedData={}; } catch (e){ parsedData={}; }
  const validatedCounts = {}; let stateModified = false;
  for (const chatId in parsedData) {
    if (!Object.prototype.hasOwnProperty.call(parsedData, chatId)) continue;
    const entry = parsedData[chatId];
    let {count=0, ignoredCount=0, totalCountSinceActive=0, lastText="", firstUnreadTimestamp=null, lastActivityTimestamp=0, lastReadByScriptTimestamp = null, lastSeenDomTextBeforeRead = ""} = entry || {};
    if (typeof entry === 'number' && entry >= 0) { // Old format migration
        count = Math.floor(entry); stateModified = true;
        lastActivityTimestamp = Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30);
    } else if (typeof entry === 'object' && entry !== null) {
      count=Math.floor(entry.count>=0?entry.count:0);if(count!==entry.count)stateModified=true;
      ignoredCount=Math.floor(entry.ignoredCount>=0?entry.ignoredCount:0);if(ignoredCount!==entry.ignoredCount)stateModified=true;
      totalCountSinceActive=Math.floor(entry.totalCountSinceActive>=0?entry.totalCountSinceActive:0);if(totalCountSinceActive!==entry.totalCountSinceActive)stateModified=true;
      lastText=typeof entry.lastText==='string'?entry.lastText:"";if(lastText!==entry.lastText && entry.lastText !== undefined)stateModified=true;
      firstUnreadTimestamp=typeof entry.firstUnreadTimestamp==='number'&&entry.firstUnreadTimestamp>0?entry.firstUnreadTimestamp:null;if(firstUnreadTimestamp!==entry.firstUnreadTimestamp&&entry.firstUnreadTimestamp!==undefined)stateModified=true;
      lastActivityTimestamp = typeof entry.lastActivityTimestamp === 'number' && entry.lastActivityTimestamp > 0 ? entry.lastActivityTimestamp : (firstUnreadTimestamp || Date.now());
      if (entry.lastActivityTimestamp === undefined) stateModified = true;
      lastReadByScriptTimestamp = typeof entry.lastReadByScriptTimestamp === 'number' && entry.lastReadByScriptTimestamp > 0 ? entry.lastReadByScriptTimestamp : null;
      if (entry.lastReadByScriptTimestamp === undefined) stateModified = true;
      lastSeenDomTextBeforeRead = typeof entry.lastSeenDomTextBeforeRead === 'string' ? entry.lastSeenDomTextBeforeRead : "";
      if (entry.lastSeenDomTextBeforeRead === undefined) stateModified = true;
      if(count===0&&firstUnreadTimestamp!==null){firstUnreadTimestamp=null;stateModified=true;}
      if(count===0 && ignoredCount===0 && totalCountSinceActive===0 && firstUnreadTimestamp===null && lastText!=="" && chatId !== NOC_CHAT_ID){lastText="";stateModified=true;}
    }else{stateModified=true;continue;}
    validatedCounts[chatId]={count,ignoredCount,totalCountSinceActive,lastText,firstUnreadTimestamp,lastActivityTimestamp, lastReadByScriptTimestamp, lastSeenDomTextBeforeRead};
  }
  scriptChatCounts=validatedCounts;
  const pruned = await enforceRecordLimit();
  if(stateModified || pruned) await saveCounts();
  logEvent('INFO',`--- loadCounts END. ${Object.keys(scriptChatCounts).length} chats tracked. State modified during load: ${stateModified}. Pruned: ${pruned} ---`);
  updateTrackedChatsCountDisplay();
}


async function saveCounts() {
  try {
    const hadToPrune = await enforceRecordLimit();
    if (hadToPrune) logEvent('INFO', 'Records pruned due to limit before saving state.');
    const dataToSave = {};
    for (const chatId in scriptChatCounts) {
      if (!Object.prototype.hasOwnProperty.call(scriptChatCounts, chatId)) continue;
      let { count, ignoredCount, totalCountSinceActive, lastText, firstUnreadTimestamp, lastActivityTimestamp, lastReadByScriptTimestamp, lastSeenDomTextBeforeRead } = scriptChatCounts[chatId] || {};
      count = Math.floor(typeof count === 'number' && count >= 0 ? count : 0);
      ignoredCount = Math.floor(typeof ignoredCount === 'number' && ignoredCount >= 0 ? ignoredCount : 0);
      totalCountSinceActive = Math.floor(typeof totalCountSinceActive === 'number' && totalCountSinceActive >= 0 ? totalCountSinceActive : 0);
      lastText = typeof lastText === 'string' ? lastText : "";
      firstUnreadTimestamp = (count === 0 && ignoredCount === 0) || typeof firstUnreadTimestamp !== 'number' || firstUnreadTimestamp <= 0 ? null : firstUnreadTimestamp;
      lastActivityTimestamp = typeof lastActivityTimestamp === 'number' && lastActivityTimestamp > 0 ? lastActivityTimestamp : Date.now();
      lastReadByScriptTimestamp = typeof lastReadByScriptTimestamp === 'number' && lastReadByScriptTimestamp > 0 ? lastReadByScriptTimestamp : null;
      lastSeenDomTextBeforeRead = typeof lastSeenDomTextBeforeRead === 'string' ? lastSeenDomTextBeforeRead : "";
      if (count === 0 && ignoredCount === 0 && firstUnreadTimestamp === null && chatId !== NOC_CHAT_ID) {
        lastText = "";
      }
      if (count === 0 && ignoredCount === 0 && totalCountSinceActive === 0 && firstUnreadTimestamp === null && chatId !== NOC_CHAT_ID) {
        lastText = "";
      }
      dataToSave[chatId] = { count, ignoredCount, totalCountSinceActive, lastText, firstUnreadTimestamp, lastActivityTimestamp, lastReadByScriptTimestamp, lastSeenDomTextBeforeRead };
    }
    await GM_setValue(CC_STORAGE_COUNTS, JSON.stringify(dataToSave));
    if (document.getElementById('storage-monitor-container')) updateStorageMonitorView();
    updateTrackedChatsCountDisplay();
  } catch (e) { logEvent('ERROR', '--- saveCounts END: FAILED to save counts! ---', e); }
}

// --- Styles ---
function addCoreStyles() {
  const badgeHeight = 20; const badgeFontSize = 12; const badgePaddingH = 6; const badgeTopOffset = 2; const badgeSpacing = 3; const rightEdgeOffset = 8;
  const approxBadgeChars = 3; const approxCharWidth = 7; const numBadgesMax = 6;
  const approxPaddingNeeded = rightEdgeOffset + (numBadgesMax * (badgePaddingH * 2 + approxBadgeChars * approxCharWidth)) + ((numBadgesMax - 1) * badgeSpacing) + 10;
  const overlayButtonFontSize = '16px'; const overlayButtonPadding = '10px'; const overlayPadding = '10px'; const overlayButtonBorderRadius = '6px';
  const badgeLabelPaddingV = '2px'; const badgeLabelPaddingH = '6px'; const badgeLabelBorderRadius = '4px'; const badgeLabelMarginLeft = '4px'; const badgeLabelFontSize = '11px';
  const clearButtonBgColor = '#dc3545'; const clearButtonHoverBgColor = '#c82333';
  let cssRules = `
    ${CHAT_TAB_SELECTOR_ALL} { position: relative !important; overflow: hidden !important; padding-right: ${approxPaddingNeeded}px !important; box-sizing: border-box; }
    ${CHAT_TAB_SELECTOR_ALL} ${CHAT_TITLE_CONTAINER_SELECTOR} { display: flex !important; align-items: baseline !important; flex-wrap: nowrap !important; min-width: 0; box-sizing: border-box !important; }
    ${CHAT_TAB_SELECTOR_ALL} ${STATUS_ICON_SELECTOR} { flex-shrink: 0 !important; margin-right: 4px !important; }
    ${CHAT_TAB_SELECTOR_ALL} ${CHAT_TITLE_CMR_LINK_SELECTOR} { flex-shrink: 0 !important; margin-right: 4px !important; text-decoration: none !important; color: #FFFFFF !important; }
    ${CHAT_TAB_SELECTOR_ALL} ${CHAT_TITLE_CONTAINER_SELECTOR} > ${CHAT_TITLE_DESC_SPAN_SELECTOR} { flex-shrink: 1 !important; min-width: 0 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; display: block !important; color: #FFFFFF !important; margin-left: 0px !important; }
    ${LAST_MESSAGE_CONTAINER_SELECTOR} { padding-right: 0 !important; box-sizing: border-box !important; display: block !important; color: inherit; margin-top: 2px; line-height: 1.3; min-height: 1em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .${CC_BADGE_CONTAINER_CLASS} { position: absolute !important; top: ${badgeTopOffset}px !important; right: ${rightEdgeOffset}px !important; display: flex !important; flex-direction: row-reverse !important; align-items: center !important; gap: ${badgeSpacing}px !important; z-index: 5 !important; pointer-events: none; }
    .${CC_INJECTED_COUNTER_CLASS}, .${CC_TIMESTAMP_BADGE_CLASS}, .${CC_ELAPSED_BADGE_CLASS}, .${CC_IGNORED_BADGE_CLASS}, .${CC_TOTAL_BADGE_CLASS}, ${UNREAD_COUNT_SELECTOR} { display: inline-flex !important; align-items: center !important; justify-content: center !important; height: ${badgeHeight}px !important; padding: 0 ${badgePaddingH}px !important; margin: 0 !important; border-radius: ${badgeHeight / 2}px !important; font-size: ${badgeFontSize}px !important; line-height: ${badgeHeight}px !important; color: white !important; box-sizing: border-box !important; transition: opacity 0.2s ease-out, background-color 0.2s ease-out, display 0s linear 0.2s !important; opacity: 1; text-shadow: 1px 1px 1px rgba(0,0,0,0.2); white-space: nowrap; }
    .${CC_ELAPSED_BADGE_CLASS} { background-color: ${ELAPSED_BADGE_COLOR} !important; font-weight: normal !important; }
    .${CC_TIMESTAMP_BADGE_CLASS} { background-color: ${TIMESTAMP_BADGE_COLOR} !important; font-weight: normal !important; }
    .${CC_INJECTED_COUNTER_CLASS} { background-color: ${SCRIPT_BADGE_COLOR} !important; font-weight: bold !important; }
    .${CC_IGNORED_BADGE_CLASS} { background-color: ${IGNORED_BADGE_COLOR} !important; font-weight: bold !important; }
    .${CC_TOTAL_BADGE_CLASS} { background-color: ${TOTAL_BADGE_COLOR} !important; font-weight: bold !important; }
    ${UNREAD_COUNT_SELECTOR} { background-color: ${NATIVE_BADGE_COLOR} !important; font-weight: bold !important; }
    ${UNREAD_COUNT_SELECTOR}.${HIDE_CLASS_NATIVE} { display: none !important; }
    div.${HIDE_CLASS_NATIVE}, span.${HIDE_CLASS_SCRIPT}, span.${HIDE_CLASS_TIMESTAMP}, span.${HIDE_CLASS_ELAPSED}, span.${HIDE_CLASS_IGNORED}, span.${HIDE_CLASS_TOTAL} { display: none !important; }
    #sorter-overlay-container { position: fixed !important; top: 10px !important; right: 10px !important; background-color: rgba(240, 240, 240, 0.9) !important; padding: 10px 15px !important; border: 1px solid #ccc !important; border-radius: 5px !important; z-index: 9999 !important; font-size: 12px !important; font-family: Arial, sans-serif !important; transition: min-width 0.2s ease-out, padding 0.2s ease-out; max-height: 90vh; overflow-y: auto; }
    #sorter-overlay-container strong { display: block; margin-bottom: 8px; color: #333; }
    #sorter-overlay-container label { display: block; margin-bottom: 5px; cursor: pointer; color: #555; line-height: 1.5; }
    #sorter-overlay-container input[type="radio"], #sorter-overlay-container input[type="checkbox"] { margin-right: ${badgeLabelMarginLeft}px; vertical-align: middle; }
    #sorter-overlay-container hr { border: none; border-top: 1px solid #ccc; margin: 10px 0; }
    .${CC_MARK_ALL_READ_BUTTON_CLASS} { display: block; margin-bottom: 5px; width: 100%; padding: 8px; font-size: 11px; font-weight: bold; color: white; background-color: #007bff; border: none; border-radius: 4px; cursor: pointer; text-align: center; transition: background-color 0.2s ease-out; }
    .${CC_MARK_ALL_READ_BUTTON_CLASS}:hover { background-color: #0056b3; }
    .${CC_CLEAR_STORAGE_BUTTON_CLASS} { display: block; width: 100%; padding: 8px; font-size: 11px; font-weight: bold; color: white; background-color: ${clearButtonBgColor}; border: none; border-radius: 4px; cursor: pointer; text-align: center; transition: background-color 0.2s ease-out; }
    .${CC_CLEAR_STORAGE_BUTTON_CLASS}:hover { background-color: ${clearButtonHoverBgColor}; }
    #visibility-controls label span { display: inline-block; padding: ${badgeLabelPaddingV} ${badgeLabelPaddingH}; border-radius: ${badgeLabelBorderRadius}; color: white; font-weight: bold; font-size: ${badgeLabelFontSize}; vertical-align: middle; text-shadow: 1px 1px 1px rgba(0,0,0,0.2); margin-left: ${badgeLabelMarginLeft}px; }
    #sorter-overlay-container #${LABEL_SPAN_ID_NATIVE} { background-color: ${NATIVE_BADGE_COLOR}; }
    #sorter-overlay-container #${LABEL_SPAN_ID_UNIGNORED} { background-color: ${SCRIPT_BADGE_COLOR}; }
    #sorter-overlay-container #${LABEL_SPAN_ID_IGNORED} { background-color: ${IGNORED_BADGE_COLOR}; }
    #sorter-overlay-container #${LABEL_SPAN_ID_TOTAL} { background-color: ${TOTAL_BADGE_COLOR}; }
    #sorter-overlay-container #${LABEL_SPAN_ID_TIMESTAMP} { background-color: ${TIMESTAMP_BADGE_COLOR}; }
    #sorter-overlay-container #${LABEL_SPAN_ID_ELAPSED} { background-color: ${ELAPSED_BADGE_COLOR}; }
    #sorter-toggle-button { position: absolute !important; top: 3px; right: 3px; background: #e0e0e0; border: 1px solid #b0b0b0; border-radius: 3px; font-size: 14px; line-height: 1; padding: 0px 4px; cursor: pointer; color: #333; z-index: 10; font-family: monospace; }
    #sorter-toggle-button:hover { background: #d0d0d0; color: #000; }
    #sorter-overlay-container.sorter-collapsed { min-width: 30px !important; width: auto !important; height: auto !important; padding: 5px !important; overflow: hidden; max-height: none; }
    #sorter-overlay-container.sorter-collapsed > *:not(#sorter-toggle-button) { display: none !important; }
    #sorter-overlay-container.sorter-collapsed #sorter-toggle-button { top: 2px; right: 2px; }
    #timestamp-overlay { position: fixed; background-color: rgba(220, 220, 255, 0.9); border: 1px solid #aaa; border-radius: 5px; padding: ${overlayPadding}; z-index: 9998; cursor: grab; resize: both; overflow: auto; min-width: ${overlayMinWidth}; min-height: ${overlayMinHeight}; box-shadow: 2px 2px 5px rgba(0,0,0,0.2); font-family: Arial, sans-serif; font-size: 14px; display: flex; flex-direction: column; justify-content: center; }
    #timestamp-overlay button#oldest-timestamp-button { width: 100%; padding: ${overlayButtonPadding} !important; font-size: ${overlayButtonFontSize} !important; background-color: #f8f9fa !important; border: 1px solid #ced4da !important; border-radius: ${overlayButtonBorderRadius} !important; color: #212529 !important; transition: background-color 0.15s ease-in-out; cursor: pointer; text-align: center; box-sizing: border-box; flex-grow: 1; display: flex; align-items: center; justify-content: center; }
    #timestamp-overlay button#oldest-timestamp-button:hover { background-color: #dee2e6 !important; }
    #storage-monitor-container { margin-top: 15px; max-height: 300px; overflow-y: auto; border: 1px solid #bbb; padding: 5px; background-color: #fdfdfd; }
    #storage-monitor-table { width: 100%; border-collapse: collapse; font-size: 10px; }
    #storage-monitor-table th, #storage-monitor-table td { border: 1px solid #ddd; padding: 4px; text-align: left; word-break: break-all; }
    #storage-monitor-table th { background-color: #e9ecef; font-weight: bold; }
    #storage-monitor-table tr:nth-child(even) { background-color: #f8f9fa; }
    #refresh-storage-view-button { display: block; width: 100%; padding: 5px; margin-top: 5px; font-size: 11px; font-weight: bold; color: white; background-color: #17a2b8; border: none; border-radius: 4px; cursor: pointer; text-align: center; transition: background-color 0.2s ease-out; }
    #refresh-storage-view-button:hover { background-color: #138496; }

    /* Debug Overlay Styles */
    #${DEBUG_OVERLAY_ID} {
        position: fixed !important;
        bottom: 10px !important;
        right: 10px !important;
        width: 450px !important;
        height: 250px !important;
        background-color: rgba(245, 245, 220, 0.95) !important; /* Light yellow */
        border: 1px solid #ccc !important;
        border-radius: 5px !important;
        z-index: 10000 !important; /* Highest z-index */
        font-family: Consolas, Monaco, monospace !important;
        font-size: 10px !important;
        color: #333 !important;
        display: flex;
        flex-direction: column;
        box-shadow: 0 0 10px rgba(0,0,0,0.2);
    }
    #${DEBUG_LOG_CONTAINER_ID} {
        flex-grow: 1;
        overflow-y: scroll !important;
        padding: 5px !important;
        background-color: rgba(255, 255, 255, 0.8) !important;
    }
    .rc-combo-debug-log-entry {
        padding: 2px 0 !important;
        border-bottom: 1px dotted #eee !important;
        white-space: pre-wrap !important; /* Allow wrapping but preserve spaces */
        word-break: break-all; /* Break long words if necessary */
    }
    .rc-combo-debug-log-entry:last-child {
        border-bottom: none !important;
    }
  `;
  cssRules += `
    .${CUSTOM_PREVIEW_CLASS} {
      padding-right: 0 !important;
      box-sizing: border-box !important;
      display: block !important;
      color: inherit;
      margin-top: 2px;
      line-height: 1.3;
      min-height: 1em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: normal !important;
    }
  `;
  try { GM_addStyle(cssRules); } catch(e) { logEvent('ERROR', 'Failed to inject CSS styles', e); }
}

// --- Helper Functions ---
function getBadgeContainer(tabElement, createIfMissing = false) {
  if (!tabElement) return null;
  let container = tabElement.querySelector(`.${CC_BADGE_CONTAINER_CLASS}`);
  if (!container && createIfMissing) {
    try { container = document.createElement('div'); container.className = CC_BADGE_CONTAINER_CLASS; tabElement.prepend(container); }
    catch (e) { logEvent('ERROR', 'Failed to create badge container', e); return null; }
  } return container;
}
function formatTimestamp(unixTimestamp) {
  if (typeof unixTimestamp !== 'number' || isNaN(unixTimestamp) || unixTimestamp <= 0) { return ''; }
  try { const date = new Date(unixTimestamp); const h = String(date.getHours()).padStart(2, '0'); const m = String(date.getMinutes()).padStart(2, '0'); return `${h}:${m}`; }
  catch (e) { return '??:??'; }
}
function formatElapsedTime(startTimestamp) {
  if (typeof startTimestamp !== 'number' || isNaN(startTimestamp) || startTimestamp <= 0) { return ''; }
  try { const n = Date.now(), dS = Math.max(0,Math.floor((n-startTimestamp)/1000)), tM=Math.floor(dS/60), h=Math.floor(tM/60), m=tM%60; if(h>0)return`${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m`; return`${String(m).padStart(2,'0')}m`;}
  catch (e) { return '??m'; }
}

