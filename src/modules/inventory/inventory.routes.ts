import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { ROLES } from "@/shared/constants/roles.js";
import { adjust, balances, consume, createCategory, createItem, createLocation, deactivateItem, deactivateLocation, history, issue, listCategories, listItems, listLocations, receive, release, reserve, updateItem, updateLocation, transfer, returnStock, overview, reconcile } from "./inventory.controller.js";

const router = Router();
router.use(authMiddleware);
const managers = [ROLES.ADMIN, ROLES.FACILITY_MANAGER];
const viewers = [ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF];
const stockManagers = [ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN];

router.get("/overview", authorize(...viewers), overview);
router.get("/reconciliation", authorize(...managers), reconcile);
router.get("/items", authorize(...viewers), listItems);

router.post("/items", authorize(...managers), createItem);
router.patch("/items/:id", authorize(...managers), updateItem);
router.post("/items/:id/deactivate", authorize(...managers), deactivateItem);
router.get("/categories", authorize(...viewers), listCategories);
router.post("/categories", authorize(...managers), createCategory);
router.get("/locations", authorize(...viewers), listLocations);
router.post("/locations", authorize(...managers), createLocation);
router.patch("/locations/:id", authorize(...managers), updateLocation);
router.post("/locations/:id/deactivate", authorize(...managers), deactivateLocation);
router.get("/balances", authorize(...viewers), balances);
router.get("/history", authorize(...viewers), history);
router.post("/transactions/receive", authorize(...stockManagers), receive);
router.post("/transactions/reserve", authorize(...stockManagers), reserve);
router.post("/transactions/release", authorize(...stockManagers), release);
router.post("/transactions/issue", authorize(...stockManagers), issue);
router.post("/transactions/consume", authorize(...stockManagers), consume);
router.post("/transactions/adjust", authorize(...managers), adjust);
router.post("/transactions/transfer", authorize(...stockManagers), transfer);
router.post("/transactions/return", authorize(...stockManagers), returnStock);

export default router;
