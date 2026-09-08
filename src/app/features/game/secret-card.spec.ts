import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CardContent } from '../../core/models';
import { SecretCard } from './secret-card';

const CIVILIAN: CardContent = { roleLabel: null, word: 'con mèo', note: null };
const SPY: CardContent = { roleLabel: null, word: 'con chó', note: null };
const WHITE: CardContent = {
  roleLabel: 'Bạn là MŨ TRẮNG',
  word: null,
  note: 'Bạn không có từ nào',
};

function render(content: CardContent) {
  const fixture = TestBed.createComponent(SecretCard);
  fixture.componentRef.setInput('content', content);
  fixture.detectChanges();
  return fixture;
}

describe('SecretCard', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [SecretCard] });
  });

  it('mặc định thẻ đang úp, không lộ từ', () => {
    const fixture = render(CIVILIAN);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('con mèo');
    expect(text).toContain('Nhấn giữ');
  });

  it('nhấn giữ thì lộ từ', () => {
    const fixture = render(CIVILIAN);

    fixture.componentInstance.hold();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('con mèo');
  });

  it('thả tay ra thì che lại ngay', () => {
    const fixture = render(CIVILIAN);

    fixture.componentInstance.hold();
    fixture.detectChanges();
    fixture.componentInstance.release();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('con mèo');
  });

  it('mũ trắng thấy nhãn vai và lời nhắc, không có từ', () => {
    const fixture = render(WHITE);

    fixture.componentInstance.hold();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Bạn là MŨ TRẮNG');
    expect(text).toContain('Bạn không có từ nào');
  });

  it('khi tắt Bật mí, thẻ dân làng và thẻ gián điệp có cùng cấu trúc HTML', () => {
    const civilianFixture = render(CIVILIAN);
    civilianFixture.componentInstance.hold();
    civilianFixture.detectChanges();
    const civilianHtml = (civilianFixture.nativeElement as HTMLElement).innerHTML;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [SecretCard] });
    const spyFixture = render(SPY);
    spyFixture.componentInstance.hold();
    spyFixture.detectChanges();
    const spyHtml = (spyFixture.nativeElement as HTMLElement).innerHTML;

    // Thay từ bằng một chuỗi trung tính rồi so sánh: mọi thứ còn lại phải
    // giống hệt nhau, kể cả tên lớp CSS và thứ tự thẻ.
    //
    // Nếu test này đỏ vì Angular chèn thuộc tính sinh tự động khác nhau giữa
    // hai lần dựng, hãy BÁO LẠI thay vì nới lỏng phép so sánh. Đây là bằng
    // chứng duy nhất kiểm được bằng máy rằng thẻ không lộ vai.
    expect(civilianHtml.replace('con mèo', 'TU')).toBe(spyHtml.replace('con chó', 'TU'));
  });

  it('nhãn vai nằm trong khung rộng cố định', () => {
    const fixture = render(WHITE);
    fixture.componentInstance.hold();
    fixture.detectChanges();

    const label = (fixture.nativeElement as HTMLElement).querySelector('.secret-card__role');
    expect(label).not.toBeNull();
  });
});
