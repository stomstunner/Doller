import {Router} from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    globalSearch,
    getGLobalHistory,
    deleteGlobalSearchHistory
} from "../controllers/search.controller.js"

const router = Router();

// now we write the route 
// get

router.route("/global-search").get(verifyJWT, globalSearch);
router.route("/get-global-search-history").get(verifyJWT, getGLobalHistory);

// delete
router.route("/delete-global-search-history/:historyId").delete(verifyJWT, deleteGlobalSearchHistory);

export default router;