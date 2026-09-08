import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { maxSpyCount, suggestedSpyCount } from '../../core/engine/team-rules';
import { DEFAULT_GAME_CONFIG } from '../../core/models';
import { TOPICS } from '../../data/word-bank';
import { SettingsRepository } from '../../data/repositories/settings.repository';
import { NewGameDraftStore } from '../../state/new-game-draft.store';

/** Tên làng bốc ngẫu nhiên, cốt cho vui và để câu thoại dẫn chuyện có chỗ nhét vào. */
const VILLAGE_NAMES = [
  'Ác Quỷ',
  'Vô Tội',
  'Cà Khịa',
  'Bảy Núi',
  'Mộng Mơ',
  'Lắm Chuyện',
  'Hiền Lành',
  'Bí Ẩn',
];

@Component({
  selector: 'app-config-page',
  imports: [FormsModule],
  template: `
    <div class="screen">
      <div>
        <p class="screen__eyebrow">Bước 2 / 2</p>
        <h1 class="screen__title">Luật chơi ván này</h1>
      </div>

      <div class="field">
        <label class="field__label" for="village">Tên làng</label>
        <div class="config__village">
          <input
            id="village"
            class="input config__village-input"
            type="text"
            placeholder="làng ta"
            [ngModel]="villageName()"
            (ngModelChange)="villageName.set($event)"
          />
          <button type="button" class="btn btn--ghost" (click)="rollVillageName()">🎲</button>
        </div>
      </div>

      <div class="field">
        <span class="field__label">Số gián điệp</span>
        <div class="config__steps">
          @for (n of spyChoices(); track n) {
            <button
              type="button"
              class="config__step"
              [class.config__step--on]="spyCount() === n"
              (click)="setSpyCount(n)"
            >
              {{ n }}
            </button>
          }
        </div>
        <p class="muted">{{ teamSummary() }}</p>
      </div>

      <label class="config__toggle">
        <input
          type="checkbox"
          [ngModel]="hasWhite()"
          (ngModelChange)="hasWhite.set($event); clampSpies()"
        />
        <span>
          <strong>Mũ trắng</strong>
          <span class="muted">Một người không có từ, phải đoán từ của dân làng.</span>
        </span>
      </label>

      <label class="config__toggle">
        <input
          type="checkbox"
          [ngModel]="revealSpyToSpy()"
          (ngModelChange)="revealSpyToSpy.set($event)"
        />
        <span>
          <strong>Bật mí</strong>
          <span class="muted">Mỗi người sẽ biết vai của mình. Ván sẽ dễ hơn cho gián điệp.</span>
        </span>
      </label>

      <div class="field">
        <span class="field__label">Chủ đề</span>
        <div class="config__topics">
          @for (topic of allTopics; track topic) {
            <button
              type="button"
              class="config__chip"
              [class.config__chip--on]="selectedTopics().includes(topic)"
              (click)="toggleTopic(topic)"
            >
              {{ topic }}
            </button>
          }
        </div>
      </div>

      <div class="screen__spacer"></div>

      @if (!canStart()) {
        <p class="warning">Chọn ít nhất một chủ đề để bắt đầu.</p>
      }

      <div class="screen__actions">
        <button type="button" class="btn btn--primary" [disabled]="!canStart()" (click)="start()">
          Bắt đầu chia bài
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .config__village {
        display: flex;
        gap: var(--space-3);
      }

      .config__village-input {
        flex: 1;
        min-width: 0;
      }

      .config__steps {
        display: flex;
        gap: var(--space-2);
      }

      .config__step {
        flex: 1;
        min-height: var(--tap);
        background: var(--ink-800);
        border: 1px solid var(--ink-600);
        border-radius: var(--radius-md);
        color: var(--paper-100);
        font-family: var(--font-body);
        font-size: 1.125rem;
        font-weight: 600;
        cursor: pointer;
      }

      .config__step--on {
        background: var(--lamp-500);
        border-color: var(--lamp-500);
        color: var(--ink-900);
      }

      .config__toggle {
        display: flex;
        gap: var(--space-3);
        align-items: flex-start;
        padding: var(--space-4);
        background: var(--ink-800);
        border-radius: var(--radius-md);
        cursor: pointer;
      }

      .config__toggle input {
        margin-top: 0.2rem;
        width: 1.25rem;
        height: 1.25rem;
        accent-color: var(--lamp-500);
      }

      .config__toggle span {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }

      .config__topics {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .config__chip {
        min-height: 44px;
        padding: 0 var(--space-4);
        background: var(--ink-800);
        border: 1px solid var(--ink-600);
        border-radius: 999px;
        color: var(--paper-400);
        font-family: var(--font-body);
        font-size: 0.9375rem;
        cursor: pointer;
      }

      .config__chip--on {
        background: var(--ink-700);
        border-color: var(--lamp-500);
        color: var(--paper-100);
      }
    `,
  ],
})
export class ConfigPage implements OnInit {
  private readonly draft = inject(NewGameDraftStore);
  private readonly settingsRepo = inject(SettingsRepository);
  private readonly router = inject(Router);

  protected readonly allTopics = [...TOPICS];

  readonly villageName = signal('');
  readonly hasWhite = signal(false);
  readonly revealSpyToSpy = signal(false);
  readonly spyCount = signal(1);
  readonly selectedTopics = signal<string[]>([...TOPICS]);

  readonly playerCount = computed(() => this.draft.playerNames().length);

  readonly maxSpies = computed(() => maxSpyCount(this.playerCount(), this.hasWhite()));

  readonly spyChoices = computed(() =>
    Array.from({ length: this.maxSpies() }, (_, i) => i + 1),
  );

  readonly teamSummary = computed(() => {
    const civilians = this.playerCount() - this.spyCount() - (this.hasWhite() ? 1 : 0);
    const white = this.hasWhite() ? ', 1 mũ trắng' : '';
    return `${civilians} dân làng, ${this.spyCount()} gián điệp${white}.`;
  });

  readonly canStart = computed(() => this.selectedTopics().length > 0);

  async ngOnInit(): Promise<void> {
    this.spyCount.set(suggestedSpyCount(this.playerCount(), this.hasWhite()));

    const settings = await this.settingsRepo.load();
    this.revealSpyToSpy.set(settings.lastRevealSpyToSpy);
  }

  rollVillageName(): void {
    const index = Math.floor(Math.random() * VILLAGE_NAMES.length);
    this.villageName.set(VILLAGE_NAMES[index]);
  }

  setSpyCount(value: number): void {
    this.spyCount.set(Math.min(Math.max(1, value), this.maxSpies()));
  }

  /**
   * Bật mũ trắng làm giảm mức tối đa số gián điệp, nên số đang chọn có thể
   * bỗng nhiên vượt ngưỡng. Kéo nó về thay vì để người dùng bấm Bắt đầu rồi
   * mới bị engine từ chối.
   */
  clampSpies(): void {
    this.setSpyCount(this.spyCount());
  }

  toggleTopic(topic: string): void {
    this.selectedTopics.update((list) =>
      list.includes(topic) ? list.filter((t) => t !== topic) : [...list, topic],
    );
  }

  async start(): Promise<void> {
    this.draft.villageName.set(this.villageName().trim());
    this.draft.config.set({
      ...DEFAULT_GAME_CONFIG,
      spyCount: this.spyCount(),
      hasWhite: this.hasWhite(),
      revealSpyToSpy: this.revealSpyToSpy(),
      topics: this.selectedTopics(),
    });

    const settings = await this.settingsRepo.load();
    await this.settingsRepo.save({ ...settings, lastRevealSpyToSpy: this.revealSpyToSpy() });

    await this.router.navigate(['/van']);
  }
}
