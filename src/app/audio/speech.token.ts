import { InjectionToken } from '@angular/core';
import { SpeechPort } from './speech-port';

/**
 * Thẻ tiêm cho cổng đọc. SpeechPort là interface nên không tồn tại lúc chạy,
 * phải có thẻ này Angular mới tiêm được: app thật cắm CapacitorSpeech, test
 * cắm SilentSpeech.
 */
export const SPEECH_PORT = new InjectionToken<SpeechPort>('SPEECH_PORT');
