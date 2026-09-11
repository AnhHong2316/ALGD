import { SfxName, SfxPort } from './sfx-port';

/** Bản phát tiếng câm dùng cho test. */
export class SilentSfx implements SfxPort {
  readonly played: SfxName[] = [];

  play(name: SfxName): void {
    this.played.push(name);
  }
}
