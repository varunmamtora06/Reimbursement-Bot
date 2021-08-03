const User = require("../models/User");

const isRegistered = async (username) => {
    const user = await User.findOne({
        username: username,
    });

    if(user){
        return user;
    } else {
        return false;
    }
}

module.exports = isRegistered;