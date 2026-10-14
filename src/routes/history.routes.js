import { Router } from "express";
import { globalSearch ,
        getGLobalHistory,
        deleteGlobalSearchHistory
        } from "../controllers/search.controller.js";

import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();


// lets make the router for the watch history
router.route("/").get(verifyJWT, globalSearch);
router.route("/get-global-search-history").get(verifyJWT,getGLobalHistory)
router.route("/delete-global-search-history/:historyId").delete(verifyJWT, deleteGlobalSearchHistory);

export default router;
