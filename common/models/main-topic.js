const { error } = require("../util");

module.exports = function(MainTopic) {
  MainTopic.list = async (limit, skip, filter, accessToken) => {
    const { Post } = MainTopic.app.models;

    if (!accessToken || !accessToken.userId) {
      throw error("Unauthorized User", 403);
    }

    limit = limit || 0;
    skip = skip || 0;

    const count = await MainTopic.count({ ...filter });

    const mainTopics = await MainTopic.find({
      where: {
        ...filter
      },
      include: ["posts", "createdBy", "category"],
      limit,
      skip
    });

    const postLimit = 4;
    const postSkip = 0;

    const result = await Promise.all(
      mainTopics.map(async mainTopic => {
        const posts = await Post.list(
          postLimit,
          postSkip,
          { mainTopicId: mainTopic.id },
          accessToken
        );
        mainTopic.subTopics = posts;
        if (posts.rows.length > 0) {
          mainTopic.upVote = posts.rows.reduce(
            (prev, next) => prev.upVote + next.upVote
          );

          mainTopic.downVote = posts.rows.reduce(
            (prev, next) => prev.downVote + next.downVote
          );
          mainTopic.numberOfFeedbacks = posts.rows.reduce(
            (prev, next) => prev.numberOfFeedbacks + next.numberOfFeedbacks
          );
        } else {
          mainTopic.upVote = 0;
          mainTopic.downVote = 0;
          mainTopic.numberOfFeedbacks = 0;
        }
        return mainTopic;
      })
    );

    return { count, rows: result };
  };

  MainTopic.remoteMethod("list", {
    description: "return list of main topics including posts inside.",
    accepts: [
      { arg: "limit", type: "number" },
      { arg: "skip", type: "number" },
      { arg: "filter", type: "object" },
      {
        arg: "accessToken",
        type: "object",
        http: ctx => {
          const req = ctx && ctx.req;
          const accessToken = req && req.accessToken ? req.accessToken : null;
          return accessToken;
        }
      }
    ],
    returns: { type: "object", root: true },
    http: { path: "/list", verb: "get" }
  });

  MainTopic.createTopic = async (accessToken, title, description) => {
    if (!accessToken || !accessToken.userId) {
      throw error("Unauthorized User", 403);
    }

    const { userId } = accessToken;

    const mainTopic = await MainTopic.create({
      title,
      description,
      createdById: userId
    });

    return mainTopic;
  };

  MainTopic.remoteMethod("createTopic", {
    description: "create new topic.",
    accepts: [
      {
        arg: "accessToken",
        type: "object",
        http: ctx => {
          const req = ctx && ctx.req;
          const accessToken = req && req.accessToken ? req.accessToken : null;
          return accessToken;
        }
      },
      { arg: "title", type: "string", required: true },
      { arg: "description", type: "string" }
    ],
    returns: { type: "object", root: true },
    http: { path: "/create-topic", verb: "post" }
  });
};
