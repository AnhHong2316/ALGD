/**
 * Cổng đọc thành lời.
 *
 * `speak` phải resolve khi đọc XONG, không phải khi bắt đầu đọc. Hàng đợi
 * trong NarrationStore dựa hẳn vào điều này để đọc tuần tự; resolve sớm là
 * các câu chồng lên nhau.
 */
export interface SpeechPort {
  speak(text: string, rate: number): Promise<void>;
  stop(): Promise<void>;
  hasVietnameseVoice(): Promise<boolean>;
}
