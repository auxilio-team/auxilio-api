const { error } = require("../util");

module.exports = function(UserFeedbackVote) {
  /**
   * Saves users feedback reaction.
   *
   * Up Vote is represented by 1
   * Down Vote is represented by -1
   * Neutral state is represented by 0
   *
   * when doubling the same reaction,the reaction will be rested to  neutral
   * i.e Up Vote + Up Vote => NEUTRAL & same goes for down vote
   *
   * @param {Object} accessToken
   * @param {String} postId
   * @param {Number} vote
   */
  UserFeedbackVote.vote = async (accessToken, feedbackId, vote) => {
    const { Feedback } = UserFeedbackVote.app.models;
    if (!(vote === 1 || vote === -1)) {
      throw error("Vote can only be 1 or -1", 422);
    }
    if (!accessToken || !accessToken.userId) throw Error("Forbidden User", 403);

    const { userId } = accessToken;

    const exists = await Feedback.findOne({ where: { id: feedbackId } });
    if (!exists) {
      throw error("Feedback does note exist", 404);
    }

    const existingReaction = await UserFeedbackVote.findOne({
      where: { userId, feedbackId }
    });
    let newVote;
    if (existingReaction) {
      newVote = existingReaction.vote === vote ? 0 : vote;
    } else {
      newVote = vote;
    }

    await UserFeedbackVote.upsertWithWhere(
      { feedbackId, userId },
      { feedbackId, userId, vote: newVote }
    );

    return { success: true };
  };

  UserFeedbackVote.remoteMethod("vote", {
    description: "Vote a feedback",
    accepts: [
      {
        arg: "accessToken",
        type: "object",
        http: ctx => {
          const req = ctx && ctx.req;
          const accessToken = req && req.accessToken;
          return accessToken ? req.accessToken : null;
        }
      },
      { arg: "feedbackId", type: "string", required: true },
      { arg: "vote", type: "number", required: true }
    ],
    returns: {
      type: "object",
      root: true
    },
    http: { verb: "post", path: "/" }
  });
};