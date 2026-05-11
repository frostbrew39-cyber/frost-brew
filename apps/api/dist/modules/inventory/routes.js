import { Router } from "express";
import { allowRoles, requireAuth } from "../../middleware/auth";
import { store } from "../../repositories/memoryStore";
export const inventoryRouter = Router();
inventoryRouter.get("/low-stock", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), (_req, res) => {
    const low = Array.from(store.inventory.values()).filter((i) => i.currentStock <= i.reorderLevel);
    res.json(low);
});
