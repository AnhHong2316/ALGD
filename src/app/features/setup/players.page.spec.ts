import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { PlayersRepository } from '../../data/repositories/players.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { NewGameDraftStore } from '../../state/new-game-draft.store';
import { PlayersPage } from './players.page';

/**
 * Trang giữ chỗ cho tuyến /cau-hinh, chỉ tồn tại trong test này.
 *
 * Cần thiết vì Router.navigate() trả về promise bị từ chối khi không khớp
 * tuyến nào. Màn cấu hình thật xuất hiện ở Task 5; ở đây ta chỉ cần một
 * đích hợp lệ để phép điều hướng thành công thay vì ném lỗi.
 */
@Component({ template: '' })
class StubConfigPage {}

function setup() {
  const storage = new MemoryStorage();
  TestBed.configureTestingModule({
    imports: [PlayersPage],
    providers: [
      provideRouter([{ path: 'cau-hinh', component: StubConfigPage }]),
      { provide: STORAGE_PORT, useValue: storage },
      PlayersRepository,
      NewGameDraftStore,
    ],
  });
  return { storage, fixture: TestBed.createComponent(PlayersPage) };
}

function addAll(page: PlayersPage, names: string[]): void {
  for (const name of names) {
    page.draftName.set(name);
    page.addPlayer();
  }
}

describe('PlayersPage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('thêm được người chơi', () => {
    const { fixture } = setup();
    addAll(fixture.componentInstance, ['Minh']);

    expect(fixture.componentInstance.names()).toEqual(['Minh']);
  });

  it('bỏ qua tên rỗng hoặc chỉ có khoảng trắng', () => {
    const { fixture } = setup();
    addAll(fixture.componentInstance, ['   ']);

    expect(fixture.componentInstance.names()).toEqual([]);
  });

  it('cắt khoảng trắng thừa hai đầu', () => {
    const { fixture } = setup();
    addAll(fixture.componentInstance, ['  Minh  ']);

    expect(fixture.componentInstance.names()).toEqual(['Minh']);
  });

  it('xoá được người chơi theo vị trí', () => {
    const { fixture } = setup();
    addAll(fixture.componentInstance, ['Minh', 'Hùng', 'Lan']);
    fixture.componentInstance.removeAt(1);

    expect(fixture.componentInstance.names()).toEqual(['Minh', 'Lan']);
  });

  it('dưới 4 người thì chưa cho đi tiếp và nói rõ lý do', () => {
    const { fixture } = setup();
    addAll(fixture.componentInstance, ['Minh', 'Hùng', 'Lan']);

    expect(fixture.componentInstance.canContinue()).toBe(false);
    expect(fixture.componentInstance.hint()).toContain('4 người');
  });

  it('đủ 4 người thì cho đi tiếp', () => {
    const { fixture } = setup();
    addAll(fixture.componentInstance, ['Minh', 'Hùng', 'Lan', 'Đức']);

    expect(fixture.componentInstance.canContinue()).toBe(true);
  });

  it('quá 12 người thì chặn thêm', () => {
    const { fixture } = setup();
    const page = fixture.componentInstance;
    addAll(page, Array.from({ length: 12 }, (_, i) => `Người ${i}`));
    addAll(page, ['Thừa']);

    expect(page.names()).toHaveLength(12);
    expect(page.hint()).toContain('12 người');
  });

  it('gọi lại được nhóm đã lưu lần trước', async () => {
    const { storage, fixture } = setup();
    await new PlayersRepository(storage).save(['Minh', 'Hùng', 'Lan', 'Đức']);

    await fixture.componentInstance.loadSaved();

    expect(fixture.componentInstance.names()).toEqual(['Minh', 'Hùng', 'Lan', 'Đức']);
  });

  it('đi tiếp thì ghi danh sách vào bản nháp và lưu lại cho lần sau', async () => {
    const { storage, fixture } = setup();
    addAll(fixture.componentInstance, ['Minh', 'Hùng', 'Lan', 'Đức']);

    await fixture.componentInstance.continue();

    expect(TestBed.inject(NewGameDraftStore).playerNames()).toEqual([
      'Minh',
      'Hùng',
      'Lan',
      'Đức',
    ]);
    expect(await new PlayersRepository(storage).load()).toEqual([
      'Minh',
      'Hùng',
      'Lan',
      'Đức',
    ]);
  });
});
