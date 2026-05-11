import { Router } from "express";
import { pool } from "../../db/pool";
import { requireAuth } from "../../middleware/auth";
import { store } from "../../repositories/memoryStore";

export const analyticsRouter = Router();

analyticsRouter.get("/overview", requireAuth, (req, res) => {
  const { startDate, endDate } = req.query;

  const allOrders = Array.from(store.orders.values());
  const filtered = allOrders.filter((o) => {
    if (!startDate || !endDate) return true;
    const placed = new Date(o.placedAt).toISOString().split('T')[0];
    return placed >= (startDate as string) && placed <= (endDate as string);
  });

  const successfulOrders = filtered.filter(o => o.status !== "CANCELLED" && o.status !== "FAILED_DELIVERY");
  const cancelledOrders = filtered.filter(o => o.status === "CANCELLED");
  const failedDeliveries = filtered.filter(o => o.status === "FAILED_DELIVERY" || (o.status === "CANCELLED" && o.channel === "DELIVERY"));

  const completed = successfulOrders.filter((o) => o.completedAt);
  const prepDurations = completed
    .filter((o) => o.prepStartedAt && o.readyAt)
    .map((o) => (new Date(o.readyAt!).getTime() - new Date(o.prepStartedAt!).getTime()) / 60000);
  const deliveryDurations = completed
    .filter((o) => o.outForDeliveryAt && o.completedAt)
    .map((o) => (new Date(o.completedAt!).getTime() - new Date(o.outForDeliveryAt!).getTime()) / 60000);
  const completionDurations = completed.map((o) => (new Date(o.completedAt!).getTime() - new Date(o.placedAt).getTime()) / 60000);
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const dailySales = Array.from(
    filtered.reduce((acc, o) => {
      const date = new Date(o.placedAt).toISOString().split('T')[0];
      if (!acc.has(date)) acc.set(date, { date, successfulOrders: 0, cancelledOrders: 0, revenue: 0, taxCollected: 0 });
      const stat = acc.get(date)!;
      const statusStr = o.status as string;
      if (statusStr === "CANCELLED" || statusStr === "FAILED_DELIVERY") {
        stat.cancelledOrders++;
      } else {
        stat.successfulOrders++;
        const subtotal = o.items.reduce((sum: number, i: any) => sum + (i.quantity * (i.unitPrice || 0)), 0);
        stat.revenue += subtotal;
        stat.taxCollected += subtotal * (o.taxRate || 0);
      }
      return acc;
    }, new Map<string, any>()).values()
  ).sort((a: any, b: any) => a.date.localeCompare(b.date));

  const totalRevenue = successfulOrders.reduce((sum, o) => sum + o.items.reduce((s: number, i: any) => s + (i.quantity * (i.unitPrice || 0)), 0), 0);
  const totalTax = successfulOrders.reduce((sum, o) => {
    const subtotal = o.items.reduce((s: number, i: any) => s + (i.quantity * (i.unitPrice || 0)), 0);
    return sum + (subtotal * (o.taxRate || 0));
  }, 0);

  res.json({
    totalOrders: successfulOrders.length,
    cancelledOrders: cancelledOrders.length,
    failedDeliveries: failedDeliveries.length,
    grossSales: totalRevenue,
    taxCollected: totalTax,
    avgPrepTimeMinutes: Number(avg(prepDurations).toFixed(2)),
    avgDeliveryTimeMinutes: Number(avg(deliveryDurations).toFixed(2)),
    avgCompletionTimeMinutes: Number(avg(completionDurations).toFixed(2)),
    daily: dailySales
  });
});

