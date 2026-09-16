import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../../core/models';
import { ActiveGameRepository } from '../../data/repositories/active-game.repository';
import { ScoreboardRepository } from '../../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../../data/repositories/settings.repository';
import { WordBankRepository } from '../../data/repositories/word-bank.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { GameSessionStore } from '../../state/game-session.store';
import { NewGameDraftStore } from '../../state/new-game-draft.store';
import { GamePage } from './game.page';
import { SFX_PORT } from '../../audio/sfx.token';
import { SilentSfx } from '../../audio/silent-sfx';
import { SilentSpeech } from '../../audio/silent-speech';
import { SPEECH_PORT } from '../../audio/speech.token';
import { NARRATION_HOLD_MS, NARRATION_RNG, NarrationStore } from '../../state/narration.store';
import { sequentialRng } from '../../state/testing/sequential-rng';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

/** Trang giữ chỗ cho tuyến gốc, chỉ tồn tại trong test này. Router.navigate()
 *  trả về promise bị từ chối khi không khớp tuyến nào, nên phải có đích thật. */
@Component({ template: '' })
class StubHomePage {}

/** Một kho lưu trữ duy nhất dùng chung cho cả bài test, để mô phỏng "cùng một
 *  cái máy" qua các lần app khởi động lại. */
function configure(storage: MemoryStorage) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [GamePage],
    providers: [
      provideRouter([{ path: '', component: StubHomePage }]),
      { provide: STORAGE_PORT, useValue: storage },
      // Màn vòng nói tự bắn TIME_ALMOST_UP qua NarrationStore, nên cây DI của
      // cả trang GamePage phải có đủ NarrationStore và các cổng nó cần.
      { provide: SPEECH_PORT, useValue: new SilentSpeech() },
      { provide: SFX_PORT, useValue: new SilentSfx() },
      { provide: NARRATION_HOLD_MS, useValue: 0 },
      { provide: NARRATION_RNG, useValue: sequentialRng() },
      NarrationStore,
      WordBankRepository,
      ActiveGameRepository,
      ScoreboardRepository,
      SettingsRepository,
      GameSessionStore,
      NewGameDraftStore,
    ],
  });
}

/**
 * Bấm một nút thật trên DOM rồi vẽ lại, để phép nối nút → hành động → đổi màn
 * cũng được ghim, chứ không chỉ phép nối pha → màn.
 *
 * Đợi vài nhịp vì mỗi hành động của kho phiên xâu chuỗi nhiều việc bất đồng bộ
 * liên tiếp: đổi signal, ghi bảng điểm, rồi mới lưu ván xuống máy.
 */
async function click(fixture: ComponentFixture<GamePage>, label: string): Promise<void> {
  const button = Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
  ).find((one) => (one.textContent ?? '').includes(label));
  if (button === undefined) throw new Error(`không thấy nút "${label}"`);
  button.click();
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  fixture.detectChanges();
}

describe('GamePage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('khôi phục giữa lúc chia bài thì rơi đúng vào người đang tới lượt', async () => {
    const storage = new MemoryStorage();
    configure(storage);

    // Chia cho hai người rồi coi như app bị đóng.
    const first = TestBed.inject(GameSessionStore);
    await first.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });
    await first.revealNext();
    await first.revealNext();

    // App khởi động lại: bộ nhớ trống, đọc lại từ máy — đúng như khi người
    // chơi bấm F5 rồi bấm "Chơi tiếp ván đang dở" ở trang chủ.
    configure(storage);
    const session = TestBed.inject(GameSessionStore);
    await session.resume();

    const fixture = TestBed.createComponent(GamePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const text = html.textContent ?? '';

    // Phải là màn chia bài, KHÔNG được nhảy tới vòng nói.
    expect(html.querySelector('app-deal-page')).not.toBeNull();
    expect(html.querySelector('app-speaking-page')).toBeNull();
    // Và đúng người thứ ba, không quay về đầu.
    expect(text).toContain('Lan');
    expect(text).toContain('3 / 4');
  });

  it('chia xong hết thì hiện màn vòng nói', async () => {
    const storage = new MemoryStorage();
    configure(storage);

    const session = TestBed.inject(GameSessionStore);
    await session.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });
    for (let i = 0; i < NAMES.length; i++) {
      await session.revealNext();
    }

    const fixture = TestBed.createComponent(GamePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('app-deal-page')).toBeNull();
    expect(html.querySelector('app-speaking-page')).not.toBeNull();
  });

  it('không có ván nào và cũng chưa nhập tên thì quay về trang chủ', async () => {
    const storage = new MemoryStorage();
    configure(storage);

    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(GamePage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(router.url).toBe('/');
  });

  it('chơi trọn một ván, mỗi pha đều có màn tương ứng', async () => {
    const storage = new MemoryStorage();
    configure(storage);

    const session = TestBed.inject(GameSessionStore);
    await session.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: {
        ...DEFAULT_GAME_CONFIG,
        spyCount: 1,
        hasWhite: false,
        minRoundsBeforeVote: 1,
      },
    });

    const fixture = TestBed.createComponent(GamePage);
    fixture.detectChanges();
    await fixture.whenStable();
    const html = fixture.nativeElement as HTMLElement;

    // Chia bài
    fixture.detectChanges();
    expect(html.querySelector('app-deal-page')).not.toBeNull();
    for (let i = 0; i < NAMES.length; i++) {
      await session.revealNext();
    }

    // Vòng nói
    fixture.detectChanges();
    expect(html.querySelector('app-speaking-page')).not.toBeNull();
    for (let i = 0; i < NAMES.length; i++) {
      await session.nextSpeaker();
    }

    // Vote
    fixture.detectChanges();
    expect(html.querySelector('app-vote-page')).not.toBeNull();
    const state = session.state()!;
    const spy = state.aliveIds.find((id) => state.assignments[id].role === 'SPY')!;
    await session.vote({ [spy]: 3 });

    // Lộ danh tính
    fixture.detectChanges();
    expect(html.querySelector('app-reveal-page')).not.toBeNull();
    await session.afterReveal();

    // Kết ván
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(html.querySelector('app-end-page')).not.toBeNull();
    expect(html.textContent).toContain('Dân làng thắng');
  });

  it('pha xử hoà có màn riêng', async () => {
    const storage = new MemoryStorage();
    configure(storage);

    const session = TestBed.inject(GameSessionStore);
    await session.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1, minRoundsBeforeVote: 1 },
    });
    for (let i = 0; i < NAMES.length; i++) {
      await session.revealNext();
    }
    for (let i = 0; i < NAMES.length; i++) {
      await session.nextSpeaker();
    }
    const [a, b] = session.alivePlayers();
    await session.vote({ [a.id]: 1, [b.id]: 1 });

    const fixture = TestBed.createComponent(GamePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-tie-page'),
    ).not.toBeNull();
  });

  it('pha mũ trắng đoán từ có màn riêng', async () => {
    const storage = new MemoryStorage();
    configure(storage);

    const names = [...NAMES, 'Mai'];
    const session = TestBed.inject(GameSessionStore);
    await session.startNew({
      villageName: 'Ác Quỷ',
      playerNames: names,
      config: {
        ...DEFAULT_GAME_CONFIG,
        spyCount: 1,
        hasWhite: true,
        minRoundsBeforeVote: 1,
      },
    });
    for (let i = 0; i < names.length; i++) {
      await session.revealNext();
    }
    for (let i = 0; i < names.length; i++) {
      await session.nextSpeaker();
    }
    const state = session.state()!;
    const white = state.aliveIds.find((id) => state.assignments[id].role === 'WHITE')!;
    await session.vote({ [white]: 4 });

    const fixture = TestBed.createComponent(GamePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-white-guess-page'),
    ).not.toBeNull();
  });

  it('bấm nút thật trên từng màn thì đi trọn ván trong vỏ', async () => {
    const storage = new MemoryStorage();
    configure(storage);

    const session = TestBed.inject(GameSessionStore);
    await session.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: {
        ...DEFAULT_GAME_CONFIG,
        spyCount: 1,
        hasWhite: false,
        minRoundsBeforeVote: 1,
      },
    });

    const fixture = TestBed.createComponent(GamePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;

    // Chia bài: mỗi người xác nhận đúng mình rồi mới xem thẻ.
    for (let i = 0; i < NAMES.length; i++) {
      await click(fixture, 'Tôi là');
      await click(fixture, 'Tôi đã xem');
    }
    expect(session.state()?.phase).toBe('SPEAKING');

    // Vòng nói
    for (let i = 0; i < NAMES.length; i++) {
      await click(fixture, 'Xong lượt');
    }
    expect(session.state()?.phase).toBe('VOTING');

    // Vote: dồn cả ba phiếu cho gián điệp. Nút cộng hiện theo cùng thứ tự với
    // `voteCandidates()` vì cả hai đều đi ra từ một vòng lặp trong khuôn mẫu —
    // phép so số nút bên dưới là chốt chặn nếu thứ tự đó đổi.
    const state = session.state()!;
    const candidates = session.voteCandidates();
    const spyIndex = candidates.findIndex(
      (person) => state.assignments[person.id].role === 'SPY',
    );
    for (let i = 0; i < 3; i++) {
      const plus = Array.from(html.querySelectorAll('button')).filter(
        (one) => (one.textContent ?? '').trim() === '+',
      );
      expect(plus).toHaveLength(candidates.length);
      plus[spyIndex].click();
      fixture.detectChanges();
    }
    await click(fixture, 'Chốt phiếu');
    expect(session.state()?.phase).toBe('REVEAL');

    // Lộ danh tính rồi kết ván
    await click(fixture, 'Tiếp tục');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(session.state()?.phase).toBe('ENDED');
    expect(html.querySelector('app-end-page')).not.toBeNull();
    expect(html.textContent).toContain('Dân làng thắng');
  });

  it('rời màn ván thì dẹp dẫn chuyện', async () => {
    configure(new MemoryStorage());

    const session = TestBed.inject(GameSessionStore);
    await session.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });

    const fixture = TestBed.createComponent(GamePage);
    fixture.detectChanges();
    await fixture.whenStable();

    // Dải dẫn chuyện nằm ở vỏ ứng dụng nên nó sống lâu hơn màn ván. Không ai
    // dọn thì câu cuối của ván nằm lại trên màn hình chính, và đợt đọc dở còn
    // chạy tiếp.
    const narration = TestBed.inject(NarrationStore);
    const cleared = vi.spyOn(narration, 'clear');

    fixture.destroy();

    expect(cleared).toHaveBeenCalled();
  });
});
