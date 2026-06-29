interface PresentationConnection {
  onmessage: ((event: MessageEvent) => void) | null;
  send: (data: string) => void;
  close(): void;
  terminate(): void;
}

interface PresentationConnectionList {
  connections: PresentationConnection[];
}

interface PresentationReceiver {
  connectionList: Promise<PresentationConnectionList>;
}

interface Presentation {
  receiver?: PresentationReceiver;
}

interface Navigator {
  presentation?: Presentation;
}

interface PresentationRequest {
  start(): Promise<PresentationConnection>;
}

declare var PresentationRequest: {
  new (urls: string[]): PresentationRequest;
};
