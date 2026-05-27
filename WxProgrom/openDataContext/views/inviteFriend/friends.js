function mapFriends(list) {
  const result = [];
  const seen = new Set();

  for (let i = 0; i < list.length; i++) {
    const item = list[i] || {};
    const openid = typeof item.openid === "string" ? item.openid.trim() : "";

    if (!openid || seen.has(openid)) {
      continue;
    }

    seen.add(openid);

    const name = item.nickName || item.nickname;

    result.push({
      openid: openid,
      nickName: typeof name === "string" && name.trim() ? name : "微信好友",
      nickname: typeof name === "string" && name.trim() ? name : "微信好友",
      avatarUrl: typeof item.avatarUrl === "string" ? item.avatarUrl : "",
    });
  }

  return result;
}

function loadFriends(state, done) {
  if (typeof done === "function") {
    state.friendCallbacks.push(done);
  }

  if (state.loadedFriends) {
    flushFriendCallbacks(state);
    return;
  }

  if (state.loadingFriends) {
    return;
  }

  state.loadingFriends = true;

  let cloudFriends = [];
  let potentialFriends = [];
  let finishedCount = 0;
  const totalCount = typeof wx.getPotentialFriendList === "function" ? 2 : 1;

  function finish() {
    finishedCount++;

    if (finishedCount < totalCount) {
      return;
    }

    state.users = mapFriends(cloudFriends.concat(potentialFriends));
    state.loadedFriends = true;
    state.loadingFriends = false;
    flushFriendCallbacks(state);
  }

  wx.getFriendCloudStorage({
    keyList: ["kv_data"],
    success: function (res) {
      cloudFriends = Array.isArray(res && res.data) ? res.data : [];
    },
    fail: function (err) {
      console.error("[OpenData] getFriendCloudStorage failed:", err);
    },
    complete: finish,
  });

  if (typeof wx.getPotentialFriendList === "function") {
    wx.getPotentialFriendList({
      success: function (res) {
        potentialFriends = Array.isArray(res && res.list) ? res.list : [];
      },
      fail: function (err) {
        console.error("[OpenData] getPotentialFriendList failed:", err);
      },
      complete: finish,
    });
  }
}

function flushFriendCallbacks(state) {
  const callbacks = state.friendCallbacks.slice();
  state.friendCallbacks.length = 0;

  for (let i = 0; i < callbacks.length; i++) {
    try {
      callbacks[i] && callbacks[i]();
    } catch (err) {
      console.error("[OpenData] friend callback failed:", err);
    }
  }
}

function createState() {
  return {
    users: [],
    loadedFriends: false,
    loadingFriends: false,
    friendCallbacks: [],
  };
}

module.exports = {
  createState: createState,
  loadFriends: loadFriends,
};
