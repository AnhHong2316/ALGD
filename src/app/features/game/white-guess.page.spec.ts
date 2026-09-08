import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../../core/models';
import { ActiveGameRepository } from '../../data/repositories/active-game.repository';
import { ScoreboardRepository } from '../../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../../data/repositories/settings.repository';
import { WordBankRepository } from '../../data/repositories/word-bank.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { GameSessionStore } from '../../state/game-session.store';
import { WhiteGuessPage } from './white-guess.page';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức', 'Mai'];

/** Chơi tới lúc vừa loại trúng mũ trắng. */
async function setup() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [WhiteGuessPage],
    providers: [
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
    config: {
      ...DEFAULT_GAME_CONFIG,
      spyCount: 1,
      hasWhite: true,
      minRoundsBeforeVote: 1,
    },
  });
  for (let i = 0; i < NAMES.length; i++) {
    await session.revealNext();
  }
  for (let i = 0; i < NAMES.length; i++) {
    await session.nextSpeaker();
  }

  const state = session.state()!;
  const white = state.aliveIds.find((id) => state.assignments[id].role === 'WHITE')!;
  await session.vote({ [white]: 4 });
  expect(session.state()?.phase).toBe('WHITE_GUESS');

  const fixture = TestBed.createComponent(WhiteGuessPage);
  fixture.detectChanges();
  return { session, fixture, civilianWord: state.civilianWord };
}

/** Gõ vào ô nhập thật, để phép nối ô nhập với signal cũng được ghim. */
function type(fixture: { nativeElement: unknown }, value: string): void {
  const input = (fixture.nativeElement as HTMLElement).querySelector('input');
  if (input === null) throw new Error('không thấy ô nhập');
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

/** Bấm nút thật trên DOM, để phép nối nút với hành động cũng được ghim. */
function click(fixture: { nativeElement: unknown }, label: string): Promise<void> {
  const button = Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
  ).find((one) => (one.textContent ?? '').includes(label));
  if (button === undefined) throw new Error(`không thấy nút "${label}"`);
  button.click();
  // Cho các promise trong kho phiên chạy xong.
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function submitButton(fixture: { nativeElement: unknown }): HTMLButtonElement {
  const button = Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
  ).find((one) => (one.textContent ?? '').includes('Chốt câu trả lời'));
  if (button === undefined) throw new Error('không thấy nút chốt');
  return button;
}

describe('WhiteGuessPage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('chưa gõ gì thì chưa gửi được', async () => {
    const { fixture } = await setup();

    expect(fixture.componentInstance.canSubmit()).toBe(false);
  });

  it('gõ toàn khoảng trắng cũng không gửi được', async () => {
    const { fixture } = await setup();

    fixture.componentInstance.text.set('   ');

    expect(fixture.componentInstance.canSubmit()).toBe(false);
  });

  it('đoán đúng thì mũ trắng thắng và ván dừng ngay', async () => {
    const { session, fixture, civilianWord } = await setup();

    fixture.componentInstance.text.set(civilianWord);
    await fixture.componentInstance.submit();

    expect(session.state()?.phase).toBe('ENDED');
    expect(session.state()?.outcome).toBe('WHITE');
  });

  it('đoán đúng nhưng viết không dấu vẫn được tính', async () => {
    const { session, fixture, civilianWord } = await setup();

    // Lọc dấu thanh bằng mã ký tự chứ không bằng regex có ký tự tổ hợp: dấu
    // thanh dán thẳng vào regex rất dễ bị trình soạn thảo nuốt mất, và khi mất
    // thì test vẫn chạy nhưng không còn kiểm đúng thứ nó định kiểm.
    const noTone = civilianWord
      .normalize('NFD')
      .split('')
      .filter((ch) => {
        const code = ch.charCodeAt(0);
        return code < 0x0300 || code > 0x036f;
      })
      .join('')
      .replace(/đ/g, 'd')
      .toUpperCase();
    fixture.componentInstance.text.set(noTone);
    await fixture.componentInstance.submit();

    expect(session.state()?.outcome).toBe('WHITE');
  });

  it('đoán sai thì ván tiếp tục, sang pha lộ danh tính', async () => {
    const { session, fixture } = await setup();

    fixture.componentInstance.text.set('quangthantuyetdoikhongphaitunay');
    await fixture.componentInstance.submit();

    expect(session.state()?.phase).toBe('REVEAL');
    expect(session.state()?.whiteGuess?.correct).toBe(false);
  });

  it('bấm gửi hai lần chỉ tính một lần đoán', async () => {
    const { session, fixture } = await setup();

    fixture.componentInstance.text.set('quangthantuyetdoikhongphaitunay');
    const first = fixture.componentInstance.submit();
    const second = fixture.componentInstance.submit();
    await Promise.all([first, second]);

    // Lần bấm thứ hai không được lọt xuống engine, vì engine chỉ nhận
    // submitWhiteGuess ở pha WHITE_GUESS và sẽ ném lỗi.
    expect(session.state()?.phase).toBe('REVEAL');
  });

  it('gõ vào ô nhập rồi bấm nút thật thì lời đoán đi tới engine', async () => {
    const { session, fixture } = await setup();

    // Đi qua DOM thật: mọi test trên đây gọi thẳng vào component, nên nếu ô
    // nhập rời khỏi signal hoặc nút rời khỏi submit() thì chúng vẫn xanh.
    type(fixture, 'quangthantuyetdoikhongphaitunay');
    fixture.detectChanges();
    await click(fixture, 'Chốt câu trả lời');

    expect(session.state()?.phase).toBe('REVEAL');
    expect(session.state()?.whiteGuess?.text).toBe('quangthantuyetdoikhongphaitunay');
  });

  it('ô nhập còn trống thì nút bị khoá, gõ vào thì mở', async () => {
    const { fixture } = await setup();

    expect(submitButton(fixture).disabled).toBe(true);

    type(fixture, 'con mèo');
    fixture.detectChanges();

    expect(submitButton(fixture).disabled).toBe(false);
  });

  it('cắt khoảng trắng thừa trước khi đưa xuống engine', async () => {
    const { session, fixture, civilianWord } = await setup();

    // Engine tự cắt khoảng trắng khi chấm, nên chỉ nhìn kết quả thì không phân
    // biệt được màn này có cắt hay không. Soi thẳng chuỗi được truyền xuống.
    const spy = vi.spyOn(session, 'guessCivilianWord');
    type(fixture, `   ${civilianWord}   `);
    fixture.detectChanges();
    await click(fixture, 'Chốt câu trả lời');

    expect(spy).toHaveBeenCalledWith(civilianWord);
    expect(session.state()?.outcome).toBe('WHITE');
  });
});
