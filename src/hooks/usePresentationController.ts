import { useState, useRef, useCallback } from "react";

export const usePresentationController = (projectionUrl: string = "/projection") => {
  const [presentationConnection, setPresentationConnection] = useState<PresentationConnection | null>(null);
  const connectionRef = useRef<PresentationConnection | null>(null);
  const fallbackWindowRef = useRef<Window | null>(null);

  const launchProjection = async () => {
    const absoluteUrl = new URL(projectionUrl, window.location.origin).href;

    if (navigator.presentation && window.PresentationRequest) {
      try {
        const request = new PresentationRequest([absoluteUrl]);
        const connection = await request.start();
        connectionRef.current = connection;
        setPresentationConnection(connection);
        return;
      } catch (err) {
        console.warn("Native Presentation API skipped or rejected, using window fallback.", err);
      }
    }

    if (!fallbackWindowRef.current || fallbackWindowRef.current.closed) {
      const width = 1920;
      const height = 1080;
      const left = window.screen.width;

      fallbackWindowRef.current = window.open(
        absoluteUrl,
        "Mentalist_Display",
        `width=${width},height=${height},left=${left},top=0,menubar=no,toolbar=no,location=no,status=no`
      );
    } else {
      fallbackWindowRef.current.focus();
    }
  };

  const sendMessage = useCallback((data: unknown) => {
    if (connectionRef.current?.send) {
      try {
        connectionRef.current.send(JSON.stringify(data));
      } catch (err) {
        console.warn("Presentation API send failed:", err);
      }
    }
  }, []);

  const closeProjection = () => {
    if (presentationConnection) {
      presentationConnection.terminate();
      setPresentationConnection(null);
      connectionRef.current = null;
    }
    if (fallbackWindowRef.current) {
      fallbackWindowRef.current.close();
      fallbackWindowRef.current = null;
    }
  };

  return { launchProjection, closeProjection, sendMessage, isActive: !!presentationConnection || !!fallbackWindowRef.current };
};
