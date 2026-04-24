import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export function getNativePlatform() {
  return Capacitor.getPlatform();
}

export function applyNativeDocumentAttributes() {
  if (typeof document === 'undefined') {
    return;
  }

  const nativeApp = isNativeApp();
  const platform = getNativePlatform();

  document.documentElement.classList.toggle('app-native', nativeApp);
  document.body.classList.toggle('app-native', nativeApp);

  if (nativeApp) {
    document.documentElement.dataset.platform = platform;
    document.body.dataset.platform = platform;
    return;
  }

  delete document.documentElement.dataset.platform;
  delete document.body.dataset.platform;
}

export function registerNativeBackButtonHandler({
  canCloseMenu,
  onCloseMenu,
  canNavigateBack,
  onNavigateBack
}) {
  if (!isNativeApp()) {
    return () => {};
  }

  let listenerHandle = null;
  let disposed = false;

  const setup = async () => {
    listenerHandle = await CapacitorApp.addListener('backButton', async () => {
      if (typeof canCloseMenu === 'function' && canCloseMenu()) {
        onCloseMenu?.();
        return;
      }

      if (typeof canNavigateBack === 'function' && canNavigateBack()) {
        onNavigateBack?.();
        return;
      }

      if (getNativePlatform() === 'android') {
        await CapacitorApp.minimizeApp();
      }
    });

    if (disposed) {
      await listenerHandle.remove();
      listenerHandle = null;
    }
  };

  setup().catch(() => {});

  return () => {
    disposed = true;
    if (listenerHandle) {
      listenerHandle.remove();
      listenerHandle = null;
    }
  };
}
