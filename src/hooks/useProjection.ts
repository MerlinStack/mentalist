import { useRef, useCallback, useEffect } from "react";
import { useProjectionStore } from "../store/projectionStore";
import type { Verse } from "../api/bible";

export function useProjection() {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const windowRef = useRef<Window | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel("scriptureflow-projection");
    return () => channelRef.current?.close();
  }, []);

  const openProjectionWindow = useCallback(() => {
    if (windowRef.current && !windowRef.current.closed) {
      windowRef.current.focus();
      return;
    }
    windowRef.current = window.open(
      "/project",
      "ScriptureFlow Projection",
      "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no",
    );
  }, []);

  const projectVerse = useCallback(
    (verse: Verse) => {
      const state = useProjectionStore.getState();
      state.projectVerse(verse);
      channelRef.current?.postMessage({
        type: "PROJECT_VERSE",
        verse: {
          ...verse,
          theme: state.theme,
          fontSize: state.fontSize,
        },
      });
    },
    [],
  );

  const clearProjection = useCallback(() => {
    channelRef.current?.postMessage({ type: "CLEAR" });
    useProjectionStore.getState().clearProjection();
  }, []);

  const updateTheme = useCallback(
    (theme: "dark" | "light" | "warm") => {
      useProjectionStore.getState().setTheme(theme);
      channelRef.current?.postMessage({ type: "SET_THEME", theme });
    },
    [],
  );

  const updateFontSize = useCallback(
    (fontSize: "medium" | "large" | "xlarge") => {
      useProjectionStore.getState().setFontSize(fontSize);
      channelRef.current?.postMessage({ type: "SET_FONT_SIZE", fontSize });
    },
    [],
  );

  const currentVerse = useProjectionStore((s) => s.currentVerse);
  const theme = useProjectionStore((s) => s.theme);
  const fontSize = useProjectionStore((s) => s.fontSize);

  return {
    openProjectionWindow,
    projectVerse,
    clearProjection,
    updateTheme,
    updateFontSize,
    currentVerse,
    theme,
    fontSize,
  };
}

export function useProjectionListener() {
  const store = useProjectionStore();

  useEffect(() => {
    const channel = new BroadcastChannel("scriptureflow-projection");

    channel.onmessage = (event) => {
      const { type, verse, theme, fontSize } = event.data;

      if (type === "PROJECT_VERSE") {
        store.projectVerse(verse);
        if (theme) store.setTheme(theme);
        if (fontSize) store.setFontSize(fontSize);
      }

      if (type === "CLEAR") {
        store.clearProjection();
      }

      if (type === "SET_THEME") {
        store.setTheme(theme);
      }

      if (type === "SET_FONT_SIZE") {
        store.setFontSize(fontSize);
      }
    };

    return () => channel.close();
  }, [store]);

  return {
    currentVerse: store.currentVerse,
    theme: store.theme,
    fontSize: store.fontSize,
    showReference: store.showReference,
    showTranslation: store.showTranslation,
    isProjecting: store.isProjecting,
  };
}
