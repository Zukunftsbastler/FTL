import type { ITime } from './ITime';

class TimeImpl implements ITime {
  private _deltaTime: number = 0;
  private _totalTime: number = 0;

  get deltaTime(): number {
    return this._deltaTime;
  }

  get totalTime(): number {
    return this._totalTime;
  }

  /**
   * Called once per frame by the game loop with the raw timestamp from
   * requestAnimationFrame. Updates deltaTime and totalTime.
   */
  tick(now: number, lastTime: number): void {
    this._deltaTime = (now - lastTime) / 1000;
    this._totalTime += this._deltaTime;
  }
}

/** Singleton Time instance. Import this in main.ts to call tick(); everywhere else use ITime. */
export const Time = new TimeImpl();
