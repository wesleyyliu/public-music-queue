const express = require("express");
const router = express.Router();
const votingService = require("../services/votingService");

router.post("/skip", async (req, res) => {
  try {
    const { userSpotifyId, songId } = req.body;

    if (!userSpotifyId || !songId) {
      return res.status(400).json({ error: "userSpotifyId and songId required" });
    }
    
    const result = await votingService.voteToSkip(userSpotifyId, songId);    
    res.json(result);
  } catch (err) {
    console.error("Error in /skip route:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
