// ============================================================
// V19.0 PHASE A: Payment Provider Factory
// 統一金流閘道工廠
// ============================================================

import type { IPaymentGateway, PaymentGateway } from './types';
import { ECPayProvider } from './ecpayProvider';
import { MockProvider } from './mockProvider';

/** 閘道實例緩存 */
const gatewayCache = new Map<PaymentGateway, IPaymentGateway>();

/** 當前啟用的閘道 */
let activeGateway: PaymentGateway = 'mock'; // V19.0 預設 mock

/** 建立或取得閘道實例 */
export function getPaymentGateway(gateway?: PaymentGateway): IPaymentGateway {
  const key = gateway || activeGateway;

  if (!gatewayCache.has(key)) {
    switch (key) {
      case 'ecpay':
        gatewayCache.set(key, new ECPayProvider());
        break;
      case 'mock':
      default:
        gatewayCache.set(key, new MockProvider());
        break;
    }
  }

  return gatewayCache.get(key)!;
}

/** 設定當前啟用的閘道 */
export function setActiveGateway(gateway: PaymentGateway): void {
  activeGateway = gateway;
  console.log('[Payment] Active gateway:', gateway);
}

/** 取得當前啟用的閘道名稱 */
export function getActiveGateway(): PaymentGateway {
  return activeGateway;
}

/** 取得所有可用閘道 */
export function getAvailableGateways(): { id: PaymentGateway; name: string; isSandbox: boolean }[] {
  return [
    { id: 'mock', name: '模擬付款', isSandbox: true },
    { id: 'ecpay', name: '綠界 ECPay', isSandbox: true },
  ];
}

/** 重置閘道緩存 (測試用) */
export function resetGatewayCache(): void {
  gatewayCache.clear();
}
