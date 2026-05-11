export type OrderChannel = "COUNTER" | "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export type OrderStatus = "PENDING" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELLED" | "FAILED_DELIVERY";
export type PaymentMethod = "CASH" | "CARD" | "MOBILE_WALLET" | "KHATA";
export type StaffRole = "MASTER_ADMIN" | "ADMIN" | "MANAGER" | "CASHIER" | "WAITER" | "KITCHEN";
export interface OrderItemInput {
    menuItemId: number;
    quantity: number;
    note?: string;
    modifiers?: Array<{
        name: string;
        extraPrice: number;
    }>;
}
export interface CreateOrderInput {
    channel: OrderChannel;
    customerId?: number;
    notes?: string;
    cancellationReason?: string;
    items: OrderItemInput[];
}
