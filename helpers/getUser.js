const User = require("../models/User");

const getUser = async (username) => {
    const user = await User.findOne({
        username: username,
    });

    if(user){
        return user;
    } else {
        return false;
    }
};

module.exports = getUser;