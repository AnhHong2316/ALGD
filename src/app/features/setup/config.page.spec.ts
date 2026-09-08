import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsRepository } from '../../data/repositories/settings.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { NewGameDraftStore } from '../../state/new-game-draft.store';
import { ConfigPage } from './config.page';

/** Trang giữ chỗ cho tuyến /van, chỉ tồn tại trong test này. Router.navigate()
 *  trả về promise bị từ chối khi không khớp tuyến nào, nên phải có một đích
 *  hợp lệ thì phép điều hướng mới thành công. Màn ván thật ở Task 6. */
@Component({ template: '' })
class StubGamePage {}

function setup(playerCount = 6) {
  const storage = new MemoryStorage();
  TestBed.configureTestingModule({
    imports: [ConfigPage],
    providers: [
      provideRouter([{ path: 'van', component: StubGamePage }]),
      { provide: STORAGE_PORT, useValue: storage },
      SettingsRepository,
      NewGameDraftStore,
    ],
  });
  const draft = TestBed.inject(NewGameDraftStore);
  draft.playerNames.set(Array.from({ length: playerCount }, (_, i) => `Người ${i + 1}`));
  return { storage, draft, fixture: TestBed.createComponent(ConfigPage) };
}

describe('ConfigPage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('điền sẵn số gián điệp gợi ý theo sĩ số', async () => {
    const { fixture } = setup(8);
    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.spyCount()).toBe(2);
  });

  it('mức tối đa số gián điệp giảm khi bật mũ trắng', () => {
    const { fixture } = setup(7);
    const page = fixture.componentInstance;

    expect(page.maxSpies()).toBe(3);
    page.hasWhite.set(true);
    expect(page.maxSpies()).toBe(2);
  });

  it('bật mũ trắng khi đang chọn quá nhiều gián điệp thì tự kéo về mức hợp lệ', () => {
    const { fixture } = setup(7);
    const page = fixture.componentInstance;

    page.setSpyCount(3);
    expect(page.spyCount()).toBe(3);

    page.hasWhite.set(true);
    page.clampSpies();

    expect(page.spyCount()).toBe(2);
  });

  it('không cho chọn quá mức tối đa', () => {
    const { fixture } = setup(6);
    const page = fixture.componentInstance;

    page.setSpyCount(99);

    expect(page.spyCount()).toBe(page.maxSpies());
  });

  it('không cho chọn dưới 1 gián điệp', () => {
    const { fixture } = setup(6);
    const page = fixture.componentInstance;

    page.setSpyCount(0);

    expect(page.spyCount()).toBe(1);
  });

  it('đội hình 4 người vẫn bật được mũ trắng', () => {
    const { fixture } = setup(4);
    const page = fixture.componentInstance;

    page.hasWhite.set(true);
    page.clampSpies();

    expect(page.maxSpies()).toBe(1);
    expect(page.spyCount()).toBe(1);
    expect(page.canStart()).toBe(true);
  });

  it('bốc được tên làng ngẫu nhiên', () => {
    const { fixture } = setup();

    fixture.componentInstance.rollVillageName();

    expect(fixture.componentInstance.villageName().length).toBeGreaterThan(0);
  });

  it('tám chủ đề đều bật sẵn', () => {
    const { fixture } = setup();

    expect(fixture.componentInstance.selectedTopics()).toHaveLength(8);
  });

  it('tắt hết chủ đề thì không cho bắt đầu', () => {
    const { fixture } = setup();
    const page = fixture.componentInstance;

    for (const topic of [...page.selectedTopics()]) page.toggleTopic(topic);

    expect(page.selectedTopics()).toHaveLength(0);
    expect(page.canStart()).toBe(false);
  });

  it('bắt đầu thì ghi đủ cấu hình vào bản nháp', async () => {
    const { draft, fixture } = setup(6);
    const page = fixture.componentInstance;
    page.villageName.set('Ác Quỷ');
    page.hasWhite.set(true);
    page.revealSpyToSpy.set(true);
    page.setSpyCount(2);

    await page.start();

    expect(draft.villageName()).toBe('Ác Quỷ');
    expect(draft.config().spyCount).toBe(2);
    expect(draft.config().hasWhite).toBe(true);
    expect(draft.config().revealSpyToSpy).toBe(true);
    expect(draft.config().topics).toHaveLength(8);
  });

  it('nhớ lựa chọn Bật mí cho ván sau', async () => {
    const { storage, fixture } = setup(6);
    const page = fixture.componentInstance;
    page.revealSpyToSpy.set(true);

    await page.start();

    const settings = await new SettingsRepository(storage).load();
    expect(settings.lastRevealSpyToSpy).toBe(true);
  });
});
