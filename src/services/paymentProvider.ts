// ============================================================
// V13.1 正式版預留 - Payment Provider 接口
// 目前為模擬實作，正式版替換為金流閘道（綠界/Stripe）
// ============================================================

import { loadUserAccounts } from '@/repositories/authStorage';

export type PlanType = 'monthly' | 'quarterly' | 'yearly';

export interface PaymentProvider {
  /** 建立付款請求 */
  createPayment: (plan: PlanType, userEmail: string) => Promise<{ success: boolean; paymentUrl?: string; error?: string }>;
  /** 確認付款結果 */
  verifyPayment: (orderId: string) => Promise<{ success: boolean; plan?: PlanType; error?: string }>;
  /** 取消訂閱 */
  cancelSubscription: (userEmail: string) => Promise<{ success: boolean; error?: string }>;
  /** 取得用戶方案 */
  getUserPlan: (userEmail: string) => Promise<{ plan: PlanType | null; expiryDate: string | null }>;
}

/** 本地模擬實作（展示版使用） */
class LocalPaymentProvider implements PaymentProvider {
  async createPayment(plan: PlanType, userEmail: string) {
    console.log(`[MOCK] 建立付款：${plan} for ${userEmail}`);
    // 模擬：直接成功
    return {
      success: true,
      paymentUrl: '#mock-payment',
    };
  }

  async verifyPayment(orderId: string) {
    console.log(`[MOCK] 確認付款：${orderId}`);
    return { success: true, plan: 'monthly' as PlanType };
  }

  async cancelSubscription(userEmail: string) {
    console.log(`[MOCK] 取消訂閱：${userEmail}`);
    return { success: true };
  }

  async getUserPlan(userEmail: string) {
    const accounts = loadUserAccounts();
    const account = accounts[userEmail];
    if (account?.role === 'vip') {
      return { plan: 'monthly' as PlanType, expiryDate: '2099-12-31' };
    }
    return { plan: null, expiryDate: null };
  }
}

/** 單例 */
const paymentProvider = new LocalPaymentProvider();
export default paymentProvider;

/** 正式版金流實作範例：
class ECPayProvider implements PaymentProvider {
  private merchantId: string;
  private hashKey: string;
  private hashIV: string;
  
  async createPayment(plan: PlanType, userEmail: string) {
    const formData = this.buildECPayForm(plan, userEmail);
    // 導向綠界付款頁面
    return { success: true, paymentUrl: 'https://payment.ecpay.com.tw/...' };
  }
  
  // ... 其他方法
}

class StripeProvider implements PaymentProvider {
  private stripe = new Stripe(process.env.STRIPE_KEY!);
  
  async createPayment(plan: PlanType, userEmail: string) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: this.getPriceId(plan), quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/payment/success`,
      cancel_url: `${origin}/payment/cancel`,
    });
    return { success: true, paymentUrl: session.url! };
  }
}
*/
