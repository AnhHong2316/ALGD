import { InjectionToken } from '@angular/core';
import { StoragePort } from './storage-port';

/**
 * Thẻ tiêm cho cổng lưu trữ. Angular tiêm theo kiểu, mà StoragePort là một
 * interface nên không tồn tại lúc chạy. Có thẻ này thì app thật cắm
 * PreferencesStorage còn test cắm MemoryStorage, và không bên nào phải biết
 * bên kia tồn tại.
 */
export const STORAGE_PORT = new InjectionToken<StoragePort>('STORAGE_PORT');
