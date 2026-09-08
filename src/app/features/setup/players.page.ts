import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../core/engine/team-rules';
import { PlayersRepository } from '../../data/repositories/players.repository';
import { NewGameDraftStore } from '../../state/new-game-draft.store';

@Component({
  selector: 'app-players-page',
  imports: [FormsModule],
  template: `
    <div class="screen">
      <div>
        <p class="screen__eyebrow">Bước 1 / 2</p>
        <h1 class="screen__title">Ai chơi?</h1>
      </div>

      <div class="players__add">
        <input
          class="input players__input"
          type="text"
          placeholder="Tên người chơi"
          [ngModel]="draftName()"
          (ngModelChange)="draftName.set($event)"
          (keyup.enter)="addPlayer()"
        />
        <button type="button" class="btn btn--ghost players__plus" (click)="addPlayer()">
          Thêm
        </button>
      </div>

      @if (names().length === 0) {
        <button type="button" class="btn btn--quiet" (click)="loadSaved()">
          Gọi lại nhóm lần trước
        </button>
      }

      <ul class="players__list">
        @for (name of names(); track $index) {
          <li class="players__row">
            <span class="players__index">{{ $index + 1 }}</span>
            <span class="players__name">{{ name }}</span>
            <button
              type="button"
              class="players__remove"
              [attr.aria-label]="'Xoá ' + name"
              (click)="removeAt($index)"
            >
              ✕
            </button>
          </li>
        }
      </ul>

      <div class="screen__spacer"></div>

      <p class="muted">{{ hint() }}</p>

      <div class="screen__actions">
        <button
          type="button"
          class="btn btn--primary"
          [disabled]="!canContinue()"
          (click)="continue()"
        >
          Tiếp tục
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .players__add {
        display: flex;
        gap: var(--space-3);
      }

      .players__input {
        flex: 1;
        min-width: 0;
      }

      .players__plus {
        flex: 0 0 auto;
      }

      .players__list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .players__row {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        min-height: var(--tap);
        padding: 0 var(--space-4);
        background: var(--ink-800);
        border-radius: var(--radius-md);
      }

      .players__index {
        color: var(--paper-400);
        font-size: 0.875rem;
        min-width: 1.25rem;
      }

      .players__name {
        flex: 1;
        font-weight: 500;
      }

      .players__remove {
        min-width: 44px;
        min-height: 44px;
        background: none;
        border: none;
        color: var(--paper-400);
        font-size: 1.125rem;
        cursor: pointer;
      }
    `,
  ],
})
export class PlayersPage {
  private readonly draft = inject(NewGameDraftStore);
  private readonly playersRepo = inject(PlayersRepository);
  private readonly router = inject(Router);

  readonly draftName = signal('');
  readonly names = signal<string[]>([]);

  readonly canContinue = computed(
    () => this.names().length >= MIN_PLAYERS && this.names().length <= MAX_PLAYERS,
  );

  readonly hint = computed(() => {
    const count = this.names().length;
    if (count >= MAX_PLAYERS) return `Đã đủ ${MAX_PLAYERS} người, tối đa rồi.`;
    if (count < MIN_PLAYERS) return `Cần ít nhất ${MIN_PLAYERS} người, đang có ${count}.`;
    return `${count} người. Thêm được tới ${MAX_PLAYERS}.`;
  });

  addPlayer(): void {
    const name = this.draftName().trim();
    if (name.length === 0) return;
    if (this.names().length >= MAX_PLAYERS) return;

    this.names.update((list) => [...list, name]);
    this.draftName.set('');
  }

  removeAt(index: number): void {
    this.names.update((list) => list.filter((_, i) => i !== index));
  }

  async loadSaved(): Promise<void> {
    const saved = await this.playersRepo.load();
    this.names.set(saved.slice(0, MAX_PLAYERS));
  }

  async continue(): Promise<void> {
    const names = this.names();
    this.draft.playerNames.set(names);
    await this.playersRepo.save(names);
    await this.router.navigate(['/cau-hinh']);
  }
}
