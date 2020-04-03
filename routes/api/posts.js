const express = require("express");
const { check, validationResult } = require("express-validator/check");
const auth = require("../../middleware/auth");
const router = express.Router();

const Post = require("../../models/Post");
const Profile = require("../../models/Profile");
const User = require("../../models/User");

//@route    Post api/Post
//@desc     Create a post
//@access   private
router.post(
  "/",
  [
    auth,
    [
      check("text", "text is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await (await User.findById(req.user.id)).isSelected(
        "-password"
      );

      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      });

      const post = await newPost.save();
      res.json(post);
    } catch (err) {
      console.error(err.messager);
      res.status(500).send("server error");
    }
  }
);

//@route    Get api/Post
//@desc     Get all post
//@access   Private
router.get("/", auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.messager);
    res.status(500).send("server error");
  }
});

//@route    Get api/Post/:id
//@desc     Get all post by id
//@access   Private
router.get("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "post not found" });
    }
    res.json(post);
  } catch (err) {
    console.error(err.messager);

    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "post not found" });
    }

    res.status(500).send("server error");
  }
});

//@route    DELETE api/Post/:id
//@desc     DELETE a post
//@access   Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "post not found" });
    }

    //check on the user
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "user not authorized" });
    }

    await post.remove();
    res.json({ msg: "post removerd" });
  } catch (err) {
    console.error(err.message);

    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "post not found" });
    }

    res.status(500).send("server error");
  }
});

//@route    PUT api/Post/like/:id
//@desc     PUT a post
//@access   Private
router.put("/like/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    //check if the post has been liked
    if (
      post.likes.filter(like => like.user.toString() === req.user.id).length > 0
    ) {
      return res.status(400).json({ msg: "Post already liked" });
    }

    post.likes.unshift({ user: req.user.id });

    await post.save();

    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("server error");
  }
});

//@route    PUT api/Post/unlike/:id
//@desc     PUT a post
//@access   Private
router.put("/unlike/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    //check if the post has been liked
    if (
      post.likes.filter(like => like.user.toString() === req.user.id).length ==
      0
    ) {
      return res.status(400).json({ msg: "Post has not yet been liked" });
    }

    //get remove index
    const removeIndex = post.likes
      .map(like => like.user.toString())
      .indexOf(req.user.id);

    post.likes.splice(removeIndex, 1);
    await post.save();

    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("server error");
  }
});

//@route    Post api/Post/comment:id
//@desc    comment opn a post
//@access   private
router.post(
  "/comment/:id",
  [
    auth,
    [
      check("text", "text is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await (await User.findById(req.user.id)).isSelected(
        "-password"
      );

      const post = await Post.findById(req.params.id);

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      };

      post.comments.unshift(newComment);
      await post.save();
      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("server error");
    }
  }
);

//@route    DELTETE api/posts/comment/:id/:comment_id
//@desc     DELETE a comment
//@access   private

router.delete("/comment/:id/:comment_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    //pull out comment from the post
    const comment = post.comments.find(
      comment => comment.id === req.params.comment_id
    );

    if (!comment) {
      return res.status(404).json({ msg: "comment does not exist" });
    }

    //check user
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "user not authorized" });
    }

    //get remove index
    const removeIndex = post.comments
      .map(comment => comment.user.toString())
      .indexOf(req.user.id);

    post.comments.splice(removeIndex, 1);
    await post.save();

    res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("server error");
  }
});

module.exports = router;