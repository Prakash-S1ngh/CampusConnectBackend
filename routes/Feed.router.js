const express = require("express");
const multer = require("multer");
const { createFeed, getPost, deletePost, editPost, addComment, getComment } = require("../controllers/Feed.controller");
const { UserAuth } = require("../middleware/UserAuth.middleware");
const upload = multer({ dest: "temp/" });
const FeedRouter = express.Router();

FeedRouter.post("/createFeed", upload.array("images"), UserAuth ,createFeed);
FeedRouter.get("/getPost", UserAuth, getPost);
FeedRouter.get("/deletePost/:id", UserAuth, deletePost);
FeedRouter.patch('/posts/:id', upload.array("media"),UserAuth, editPost);
FeedRouter.post('/addComments',UserAuth,addComment);
FeedRouter.get('/getCommetns/:id',getComment);
// FeedRouter.get('/addComments/:id',getComment);
module.exports = FeedRouter;