const mongoose = require('mongoose');
const {uploadOnCloudinary , deleteFromCloudinary , extractPublicId} = require('../config/Cloudinary.config');
const Feed = require('../models/Feed.models');
const User = require('../models/User.models');
const { io, getIO } = require('../Socket/Socket');
const Comment = require('../models/Comment.model');
const Like = require('../models/LIke.model'); 




exports.createFeed = async (req, res) => {
    try {
      const { title, content, college, type, reactions } = req.body;
      const userId = req.userId;
      const files = req.files || [];
      const filesArray = Array.isArray(files) ? files : [files];
  
      let uploadedMedia = [];
  
      for (let file of filesArray) {
        const result = await uploadOnCloudinary(file.path, "campus");
        if (result?.secure_url) {
          uploadedMedia.push({
            url: result.secure_url,
            type: result.resource_type === 'image' ? 'image' : 'video',
          });
        }
      }
  
      const newFeed = await Feed.create({
        title,
        content,
        createdBy: userId,
        college,
        type,
        reactions: reactions || [],
        media: uploadedMedia,
      });
      
      await io.emit('new-post', newFeed); 
      return res.status(201).json({ success: true, feed: newFeed });
    } catch (error) {
      console.error("Feed creation error:", error);
      return res.status(500).json({
        success: false,
        message: "The post has not been created",
        error: error.message,
      });
    }
  };

  

exports.getPost = async (req, res) => {
    try {
      const userId = req.userId;
  
      if (!userId) {
        return res.status(400).json({ success: false, message: "User ID not found in request" });
      }
  
      // Fetch the user's college ID
      const user = await User.findById(userId).select('college');
      if (!user || !user.college) {
        return res.status(404).json({ success: false, message: "College not associated with this user" });
      }
  
      // Fetch posts related to that college
      const posts = await Feed.find({ college: user.college })
        .populate('createdBy', 'name profileImage role') // populate author info
        .populate('college')        // optional: populate college name
        .sort({ createdAt: -1 });
  
      return res.status(200).json({ success: true, posts });
  
    } catch (error) {
      console.error("Get post error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch posts",
        error: error.message
      });
    }
  };


  exports.deletePost = async (req, res) => {
    try {
      const postId = req.params.id;
      console.log("Post ID to delete:", postId);
      const post = await Feed.findById(postId);
      const user = req.userId;
  
      if (!post) {
        return res.status(404).json({ success: false, message: 'Post not found' });
      }
  
      if (post.createdBy.toString() !== user) {
        return res.status(403).json({ success: false, message: 'You are not authorized to delete this post' });
      }
  
      for (const media of post.media) {
       const public_Id = await extractPublicId(media.url);
       console.log("Public ID to delete:", public_Id);
        await deleteFromCloudinary(public_Id); 
      }
  
      await Feed.findByIdAndDelete(postId);
  
      return res.status(200).json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
      console.error('Error deleting post:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete post',
        error: error.message,
      });
    }
  };

  exports.editPost = async (req, res) => {
    try {
      const postId = req.params.id;
      const { title, content, type } = req.body;
      const files = req.files || [];
      const user = req.userId;
  
      const post = await Feed.findById(postId);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Post not found' });
      }
  
      if (post.createdBy.toString() !== user) {
        return res.status(403).json({ success: false, message: 'You are not authorized to edit this post' });
      }
  
      // Delete existing media
      for (const media of post.media) {
        const public_Id = await extractPublicId(media.url);
        await deleteFromCloudinary(public_Id);
      }
  
      // Upload new files
      const filesArray = Array.isArray(files) ? files : [files];
      let uploadedMedia = [];
      console.log("Files to upload:", files);
  
      for (let file of filesArray) {
        const result = await uploadOnCloudinary(file.path, "campus");
        if (result?.secure_url) {
          uploadedMedia.push({
            url: result.secure_url,
            type: result.resource_type === 'image' ? 'image' : 'video',
          });
        }
      }
  
      post.title = title;
      post.content = content;
      post.type = type;
      post.media = uploadedMedia;
      await post.save();
      io.emit('new-post', post); 
  
      return res.status(200).json({ success: true, message: 'Post updated', post });
    } catch (error) {
      console.error("Error editing post:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to edit post",
        error: error.message
      });
    }
  };

  //Comment's Sections 
  exports.addComment = async (req, res) => {
    try {
      const {  postId, content } = req.body;
      const userId = req.userId;

      const user = await User.findById(userId)
      if(!postId || !content || !userId){
        return res.status(400).json({ message: "Post ID, content, and user ID are required" });
      }
  
      const newComment = await Comment.create({
        feed: postId,
        user: user._id,
        comment:content,
      });
  
      const updatedPost = await Feed.findByIdAndUpdate(
        postId,
        { $push: { comments: newComment._id } },
        { new: true }
      );
      const io = getIO();
      io.to(user.college._id).emit("new-comment", { postId, comment: newComment });
  
      return res.status(200).json(updatedPost);
    } catch (err) {
      console.error("Add comment error:", err);
      res.status(500).json({ message: "Error adding comment" , error: err });
    }
  };

  exports.deleteComment = async (req, res) => {
    try {
      const { postId, commentId, user } = req.body;
  
      const updatedPost = await Post.findByIdAndUpdate(
        postId,
        { $pull: { comments: { _id: commentId } } },  // remove by comment ID
        { new: true }
      );
  
      if (!updatedPost) {
        return res.status(404).json({ error: "Post not found" });
      }
  
      const io = getIO();
      io.to(user.college._id).emit("comment-deleted", { postId, commentId });
  
      res.status(200).json(updatedPost);
    } catch (err) {
      console.error("Delete comment error:", err);
      res.status(500).json({ error: "Error deleting comment" });
    }
  };

  exports.getComment = async (req, res) => {
    try {
      const postId = req.params.id;
  
      const comments = await Comment.find({ feed: postId })
        .sort({ createdAt: -1 }) // Most recent comments first
        .populate("user", "name profileImage") // Populating user's name and profile image
        .exec();
  
      res.status(200).json({
        success:true,
        comments:comments
      });
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  };



  exports.addLikes = async (req, res) => {
    try {
      const { postId } = req.body;
      const userId = req.userId;
  
      const post = await Feed.findById(postId);
      if (!post) return res.status(404).json({ error: "Post not found" });
  
      // Check if the like already exists
      const existingLike = await Like.findOne({ user: userId, feed: postId });
  
      if (existingLike) {
        // Unlike (remove)
        await Like.deleteOne({ _id: existingLike._id });
  
        
        io.to(req.user.college._id).emit("post-unliked", {
          postId,
          userId
        });
  
        return res.status(200).json({ message: "Like removed" });
      }
  
      // Add new like
      const newLike = await Like.create({
        user: userId,
        feed: postId
      });
  
      
      io.to(req.user.college._id).emit("post-liked", {
        postId,
        userId
      });
  
      res.status(200).json({ message: "Post liked", like: newLike });
  
    } catch (error) {
      console.error("Like error:", error);
      res.status(500).json({ error: "Error toggling like" });
    }
  };