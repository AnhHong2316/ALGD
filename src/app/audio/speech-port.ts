/**
 * Cổng đọc thành lời.
 *
 * `speak` phải resolve khi đọc XONG, không phải khi bắt đầu đọc. Hàng đợi
 * trong NarrationStore dựa hẳn vào điều này để đọc tuần tự; resolve sớm là
 * các câu chồng lên nhau.
 *
 * Bản cài KHÔNG được để speak hay stop ném lỗi. Hàng đợi ở NarrationStore gọi
 * chúng mà không bọc try/catch: một lời hứa bị từ chối sẽ bỏ dở phần còn lại
 * của đợt thoại. Máy lạ, quyền bị chặn, plugin thiếu hàm — adapter tự nuốt.
 */
export interface SpeechPort {
  speak(text: string, rate: number): Promise<void>;
  stop(): Promise<void>;
  hasVietnameseVoice(): Promise<boolean>;
}
