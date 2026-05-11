import { Router } from "express";
import { allowRoles, requireAuth } from "../../middleware/auth";
import { store, saveStore } from "../../repositories/memoryStore";

export const inventoryRouter = Router();

inventoryRouter.get("/", requireAuth, (_req, res) => {
  res.json(Array.from(store.inventory.values()));
});

inventoryRouter.get("/low-stock", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), (_req, res) => {
  const low = Array.from(store.inventory.values()).filter((i) => i.currentStock <= i.alertAt);
  res.json(low);
});

inventoryRouter.post("/", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN", "MANAGER"), (req, res) => {
  const { name, category, unit, alertAt, purchasePrice } = req.body;
  const id = Date.now();
  const newItem = { id, name, category, unit, currentStock: 0, alertAt: Number(alertAt), purchasePrice: Number(purchasePrice) };
  store.inventory.set(id, newItem);
  saveStore();
  res.status(201).json(newItem);
});

inventoryRouter.put("/:id", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN", "MANAGER"), (req, res) => {
  const id = Number(req.params.id);
  const item = store.inventory.get(id);
  if (!item) return res.status(404).json({ message: "Item not found" });
  
  const { name, category, unit, alertAt, purchasePrice, currentStock } = req.body;
  if (name !== undefined) item.name = name;
  if (category !== undefined) item.category = category;
  if (unit !== undefined) item.unit = unit;
  if (alertAt !== undefined) item.alertAt = Number(alertAt);
  if (purchasePrice !== undefined) item.purchasePrice = Number(purchasePrice);
  if (currentStock !== undefined) item.currentStock = Number(currentStock);
  
  saveStore();
  res.json(item);
});

inventoryRouter.delete("/:id", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), (req, res) => {
  const id = Number(req.params.id);
  store.inventory.delete(id);
  saveStore();
  res.status(204).end();
});

