const express = require("express");
const router = express.Router();
const votingService = require("../services/votingService");

router.post("/skip", async (req, res) => {
  try {
    const { userId, songId } = req.body;

    if (!userId || !songId) {
      return res.status(400).json({ error: "userId and songId required" });
    }

    const result = await votingService.voteToSkip(userId, songId);
    res.json(result);
  } catch (err) {
    console.error("Error in /skip route:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
