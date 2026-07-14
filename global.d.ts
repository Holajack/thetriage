declare module "react-native-svg-charts";
declare module "d3-scale";
declare module "react-native-linear-gradient";

// three resolves to @types/three, but its "exports" map declares no "types"
// condition for the examples/jsm subpath, so TypeScript cannot find the loader
// declarations that ship with @types/three. Declare the one loader we use.
// NOTE: do NOT solve this with tsconfig "paths" — Metro honours tsconfig paths
// by default, and it would alias the runtime import to the types-only package.
declare module "three/examples/jsm/loaders/OBJLoader" {
  import { Group, Loader, LoadingManager } from "three";

  export class OBJLoader extends Loader {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad: (group: Group) => void,
      onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (error: unknown) => void,
    ): void;
    parse(text: string): Group;
  }
}
declare module "@playwright/test";
