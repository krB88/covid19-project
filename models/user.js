const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const validator = require('validator');

//User definition for document structure in the DB.
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error("Invalid email address. Try again")
            }
        }
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    positive: {
        type: String,
        default: "negative"
    },
    positive_datetime: {
        type: Date
    }

})

//Check if the requirements of the password are satisfied.
userSchema.statics.passwordValidation = async (password) => {

    var symbolFormat = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/
    var numberFormat = /[1234567890]/
    var capitalFormat = /[A-Z]/
    if (!symbolFormat.test(password)) {
        return "Your password must contain at least one symbol."
    }

    if (!numberFormat.test(password)) {
        return "Your password must contain at least one number."
    }

    if (!capitalFormat.test(password)) {
        return "Your password must contain at least one capital letter."
    }

    if (password.length < 8) {
        return "Your password must contain at least 8 characters."
    }

    return

}

//Find the user based in 'username' and compare the password with the password that is stored in the DB.
userSchema.statics.findAndValidate = async (username, password) => {
    const foundUser = await User.findOne({ username });
    if (foundUser !== null) {
        const isValid = await bcrypt.compareSync(password, foundUser.password);
        return isValid ? foundUser : false;
    } else {
        return false;
    }

}

//Use the middleware function hash the password before saving the document in the User collection.
userSchema.pre('save', async function (next) {
    const user = this;

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }
    next()
})

const User = mongoose.model('User', userSchema);

module.exports = User;