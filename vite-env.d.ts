/// <reference types="vite/client" />

declare module "*.json" {
  const value: any;
  export default value;
}

declare module "@xenova/transformers" {
  export function pipeline(task: string, model: string, options?: any): Promise<any>;
}
