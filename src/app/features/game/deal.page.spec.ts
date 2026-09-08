import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../../core/models';
import { ActiveGameRepository } from '../../data/repositories/active-game.repository';
import { ScoreboardRepository } from '../../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../../data/repositories/settings.repository';
import { WordBankRepository } from '../../data/repositories/word-bank.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { GameSessionStore } from '../../state/game-session.store';
import { DealPage } from './deal.page';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

async function setup() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [DealPage],
    providers: [
      provideRouter([]),
      { provide: STORAGE_PORT, useValue: new MemoryStorage() },
      WordBankRepository,
      ActiveGameRepository,
      ScoreboardRepository,
      SettingsRepository,
      GameSessionStore,
    ],
  });

  const session = TestBed.inject(GameSessionStore);
  await session.startNew({
    villageName: 'Ác Quỷ',
    playerNames: NAMES,
    config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
  });

  const fixture = TestBed.createComponent(DealPage);
  fixture.detectChanges();
  return { session, fixture };
}

describe('DealPage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('gọi tên người đang tới lượt cầm máy', async () => {
    const { fixture } = await setup();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Minh');
    expect(text).toContain('Chuyền máy cho');
  });

  it('hiện tiến độ chia bài', async () => {
    const { fixture } = await setup();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('1 / 4');
  });

  it('chưa xác nhận đúng người thì chưa hiện thẻ', async () => {
    const { fixture } = await setup();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-secret-card'),
    ).toBeNull();
  });

  it('xác nhận rồi mới hiện thẻ', async () => {
    const { fixture } = await setup();

    fixture.componentInstance.confirmIdentity();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-secret-card'),
    ).not.toBeNull();
  });

  it('xem xong thì chuyển sang người kế và thu thẻ lại', async () => {
    const { fixture } = await setup();
    fixture.componentInstance.confirmIdentity();
    fixture.detectChanges();

    await fixture.componentInstance.seen();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Hùng');
    expect(text).toContain('2 / 4');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-secret-card'),
    ).toBeNull();
  });

  it('người cuối xem xong thì ván sang pha nói', async () => {
    const { session, fixture } = await setup();

    for (let i = 0; i < 4; i++) {
      fixture.componentInstance.confirmIdentity();
      await fixture.componentInstance.seen();
    }

    expect(session.state()?.phase).toBe('SPEAKING');
  });
});
