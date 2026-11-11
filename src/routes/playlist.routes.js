import { Router } from "express";   
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createPlaylist,
    addVideoTOPlaylist,
    removeVideoFromPlaylist,
    getPlaylistById,
    getPlaylistVideos,
    getUserPlaylists,
    getMyPlaylists,
    updatePlaylist,
    deletePlaylist,
} from "../controllers/playlist.controller.js"

const router = Router();


// GET routes 
router.route("/get-playlist/:playlistId").get(verifyJWT, getPlaylistById);
router.route("/get-playlist-videos/:playlistId").get(verifyJWT,getPlaylistVideos);
router.route("/get-user-playlists/:userId").get(verifyJWT, getUserPlaylists);
router.route("/get-my-playlists").get(verifyJWT, getMyPlaylists);

// POST routes
router.route("/create-playlist").post(verifyJWT, createPlaylist);
router.route("/add-video/:playlistId/:videoId").post(verifyJWT, addVideoTOPlaylist);

// PATCH Routes
router.route("/remove-video/:playlistId/:videoId").patch(verifyJWT, removeVideoFromPlaylist);
router.route("/update-playlist/:playlistId").patch(verifyJWT,updatePlaylist);

// DELETE routes 
router.route("/delete-playlist/:playlistId").delete(verifyJWT, deletePlaylist);

export default router;