const mongoose = require("mongoose");

const ClaimSchema = new mongoose.Schema(
    {
        claimTitle: {
            type: String,
            default: '',
            require: false,
        },
        description: {
            type: String,
            require: true,
        },
        approvedBy: {
            type: String,
            default: '',
            require: false,
        },
        rejectedBy: {
            type: String,
            default: '',
            require: false,
        },
        isApproved: {
            type: Boolean,
            default: false,
            require: true,
        },
        //status can be: ['pending', 'approved', 'rejected']
        status: {
            type: String,
            default: 'pending',
            require: true,
        },
        totalAmount: {
            type: Number,
            require: true,
        },
        claimer: {
            type: String,
            require: true
        },
        claimerChatId: {
            type: Number,
            required: false,
        },

        docs: [{
            type: String,
            required: false,
        }]
    },
    { timestamps: true }
);

const Claims = mongoose.model("Claims", ClaimSchema);
module.exports = Claims;