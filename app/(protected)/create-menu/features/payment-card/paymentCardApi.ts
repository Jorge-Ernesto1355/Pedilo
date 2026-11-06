import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'

export type PaymentCard = { id: string; clabe: string; beneficiaryName: string; bankCode: string; bankName: string; isActive: boolean; bank?: { code: string; name: string } }
const credentials = { withCredentials: true }
async function request<T>(call: () => Promise<{ data: T }>) { try { return (await call()).data } catch (error) { throw normalizeApiError(error) } }
export function getPaymentCard() { return request(() => apiClient.get<{ paymentCard: PaymentCard | null }>('/businesses/payment-card', credentials)) }
export function savePaymentCard(input: { clabe: string; beneficiaryName: string }) { return request(() => apiClient.put<{ paymentCard: PaymentCard }>('/businesses/payment-card', input, credentials)) }
export function setPaymentCardStatus(isActive: boolean) { return request(() => apiClient.patch<{ paymentCard: PaymentCard }>('/businesses/payment-card/status', { isActive }, credentials)) }
export function deletePaymentCard() { return request(() => apiClient.delete<void>('/businesses/payment-card', credentials)) }
