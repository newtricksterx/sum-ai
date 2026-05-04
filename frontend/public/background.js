const POPUP_WIDTH = 375;
const POPUP_HEIGHT = 590;
const RIGHT_MARGIN = 24;
const TOP_MARGIN = 72;

let popupWindowId = null;

const getPopupPosition = async () => {
  try {
    const currentWindow = await chrome.windows.getCurrent();
    const windowLeft = typeof currentWindow.left === "number" ? currentWindow.left : 0;
    const windowTop = typeof currentWindow.top === "number" ? currentWindow.top : 0;
    const windowWidth =
      typeof currentWindow.width === "number" ? currentWindow.width : POPUP_WIDTH;

    return {
      left: Math.max(0, windowLeft + windowWidth - POPUP_WIDTH - RIGHT_MARGIN),
      top: Math.max(0, windowTop + TOP_MARGIN),
    };
  } catch {
    return { left: 0, top: 0 };
  }
};

const focusExistingPopupWindow = async () => {
  if (popupWindowId === null) {
    return false;
  }

  try {
    await chrome.windows.update(popupWindowId, { focused: true });
    return true;
  } catch {
    popupWindowId = null;
    return false;
  }
};

const openSummaryPopupWindow = async () => {
  const didFocusExisting = await focusExistingPopupWindow();
  if (didFocusExisting) {
    return;
  }

  const position = await getPopupPosition();
  const popupWindow = await chrome.windows.create({
    url: chrome.runtime.getURL("index.html"),
    type: "popup",
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
    focused: true,
    left: position.left,
    top: position.top,
  });

  popupWindowId = typeof popupWindow?.id === "number" ? popupWindow.id : null;
};

chrome.action.onClicked.addListener(() => {
  void openSummaryPopupWindow();
});

chrome.windows.onRemoved.addListener((closedWindowId) => {
  if (closedWindowId === popupWindowId) {
    popupWindowId = null;
  }
});
