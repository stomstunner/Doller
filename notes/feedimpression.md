import mongoose from "mongoose";

// ============================================================
// STEP 1: FEED IMPRESSION SCHEMA
// ============================================================

// Ye model batayega ki kisi user ko kaunsi video
// kitni baar feed mein dikhayi gayi hai.
const feedImpressionSchema = new mongoose.Schema(
  {
    // Kis user ko video dikhayi gayi.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Kaunsi video dikhayi gayi.
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true
    },

    // Pichhli baar video kab dikhayi gayi.
    lastShownAt: {
      type: Date,
      default: Date.now
    },

    // Recent period mein video kitni baar dikhayi gayi.
    impressionCount: {
      type: Number,
      default: 1,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Ek user aur ek video ke liye ek hi summary document.
// Isse har impression par naya document banana zaroori nahi.
feedImpressionSchema.index(
  { user: 1, video: 1 },
  { unique: true }
);

// User ki recent impressions efficiently nikaalne ke liye.
feedImpressionSchema.index(
  { user: 1, lastShownAt: -1 }
);

const FeedImpression = mongoose.model(
  "FeedImpression",
  feedImpressionSchema
);

export default FeedImpression;