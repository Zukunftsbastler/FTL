/**
 * Static asset registry. Assets are loaded asynchronously before the game loop starts
 * and retrieved by ID at render time.
 *
 * Usage:
 *   await AssetLoader.loadImage('ship', '/assets/ship.png');
 *   const img = AssetLoader.getImage('ship'); // HTMLImageElement | undefined
 */
export class AssetLoader {
  private static readonly images: Map<string, HTMLImageElement> = new Map();
  private static readonly jsonData: Map<string, unknown> = new Map();

  /**
   * Loads an image from a URL (including data URLs) and stores it under the given ID.
   * Returns a Promise that resolves once the image has fully loaded.
   */
  static loadImage(id: string, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        AssetLoader.images.set(id, img);
        resolve();
      };
      img.onerror = () =>
        reject(new Error(`AssetLoader.loadImage: failed to load '${url}'`));
      img.src = url;
    });
  }

  /**
   * Fetches and parses a JSON file, storing the result under the given ID.
   * Returns the typed parsed value.
   */
  static async loadJSON<T>(id: string, url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`AssetLoader.loadJSON: HTTP ${response.status} for '${url}'`);
    }
    const data = (await response.json()) as T;
    AssetLoader.jsonData.set(id, data);
    return data;
  }

  /** Returns the pre-loaded HTMLImageElement for the given ID, or undefined if not found. */
  static getImage(id: string): HTMLImageElement | undefined {
    return AssetLoader.images.get(id);
  }

  /** Returns a previously loaded JSON value cast to the expected type, or undefined. */
  static getJSON<T>(id: string): T | undefined {
    return AssetLoader.jsonData.get(id) as T | undefined;
  }
}
