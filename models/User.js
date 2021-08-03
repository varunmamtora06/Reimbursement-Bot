const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            require: true,
        },
        totalClaims: {
            type: Number,
            require: false,
        },
        // userType can be: ['claimer', 'approver']
        userType: {
            type: String,
            require: true,
        },
        userChatId: {
            type: Number,
            required: false,
        }
    },
    { timestamps: true }
);

const Users = mongoose.model('Users', UserSchema);
module.exports = Users;