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

/** Cùng hai người trên nhưng ván bật Bật mí, nên thẻ có ghi vai. */
const CIVILIAN_TOLD: CardContent = {
  roleLabel: 'Bạn là DÂN LÀNG',
  word: 'con mèo',
  note: null,
};
const SPY_TOLD: CardContent = {
  roleLabel: 'Bạn là GIÁN ĐIỆP',
  word: 'con chó',
  note: null,
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

  it('khi bật Bật mí, thẻ dân làng và thẻ gián điệp vẫn có cùng cấu trúc HTML', () => {
    const civilianFixture = render(CIVILIAN_TOLD);
    civilianFixture.componentInstance.hold();
    civilianFixture.detectChanges();
    const civilianHtml = (civilianFixture.nativeElement as HTMLElement).innerHTML;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [SecretCard] });
    const spyFixture = render(SPY_TOLD);
    spyFixture.componentInstance.hold();
    spyFixture.detectChanges();
    const spyHtml = (spyFixture.nativeElement as HTMLElement).innerHTML;

    // Test ở trên chỉ so hai thẻ đều KHÔNG ghi vai, nên nó không thể bắt được
    // thứ chỉ xuất hiện khi có vai: một lớp CSS, một thuộc tính, một nhánh
    // template rẽ theo vai. Ở chế độ Bật mí thì vai nằm sẵn trong thẻ, nên chỗ
    // đó mới là chỗ dễ rò.
    //
    // Thay cả vai lẫn từ bằng chuỗi trung tính: phần còn lại phải giống hệt.
    // Nếu test này đỏ, BÁO LẠI thay vì nới lỏng phép so sánh.
    const normalize = (html: string) =>
      html.replace(/Bạn là (DÂN LÀNG|GIÁN ĐIỆP)/, 'VAI').replace(/con (mèo|chó)/, 'TU');

    expect(normalize(civilianHtml)).toBe(normalize(spyHtml));
  });

  it('nhãn vai nằm trong khung rộng cố định', () => {
    const fixture = render(WHITE);
    fixture.componentInstance.hold();
    fixture.detectChanges();

    const label = (fixture.nativeElement as HTMLElement).querySelector('.secret-card__role');
    expect(label).not.toBeNull();
  });
});
