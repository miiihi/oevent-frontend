const FRAME_WAIT = 10; // ms
let stack = [];

let frameReq = null;


export function SyncFrames(cb: any) {
  stack.push(cb);
  if (frameReq === null) {
    frameReq = setTimeout(() => {
      frameReq = null;
      const stackCp = stack;
      stack = [];
      window.requestAnimationFrame((t) => {
        stackCp.forEach( r => { r(t); });
      });
    }, FRAME_WAIT);
  }
}
