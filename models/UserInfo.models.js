const mongoose = require('mongoose');

const UserInfoSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    bio: {
        type: String,
        required: true,
    },
    skills: {
        type: [String],
        required: true,
    },
    social: {
        linkedin: {
            type: String,
        },
        github: {
            type: String,
        },
        portfolio: {
            type: String,
        },
        projects: [
            {
              title: { type: String },
              description: { type: String },
              link: { type: String }
            }
          ]
    },
    address:{
        type:String
    }
});

const UserInfo = mongoose.model('UserInfo', UserInfoSchema);
module.exports = UserInfo;