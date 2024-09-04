const User = require("../models/user");
const OTP = require("../models/OTP");
const optgenerator = require("otp-generator")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Profile = require("../models/profile");
const mailSender = require("../utils/mailSender");
const { passwordUpdated } = require("../mail/templates/passwordUpdate");

require("dotenv").config();

exports.sendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email input
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required.",
            });
        }

        // Check if the user is already registered
        const checkUserPresent = await User.findOne({ email });
        if (checkUserPresent) {
            return res.status(409).json({
                success: false,
                message: "User already registered.",
            });
        }

        // Generate a unique 6-digit OTP
        let otp = optgenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });

        // Ensure OTP uniqueness
        let existingOTP = await OTP.findOne({ otp });
        while (existingOTP) {
            otp = optgenerator.generate(6, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false,
            });
            existingOTP = await OTP.findOne({ otp });
        }

        // Store OTP in the database
        const otpPayload = { email, otp };
        const otpBody = await OTP.create(otpPayload);

        console.log("OTP generated and stored:", otpBody);

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully.",
            otp, // I'll remove this later
        });

    } catch (error) {
        console.error("Error sending OTP:", error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: "Validation error. Please check your input.",
            });
        } else if (error.name === 'MongoError' || error.code === 11000) {
            return res.status(500).json({
                success: false,
                message: "Database error. Please try again later.",
            });
        }

        return res.status(500).json({
            success: false,
            message: "An error occurred while sending the OTP. Please try again later.",
        });
    }
};

//Signup
exports.signUp = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            contactNumber,
            otp
        } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !password || !confirmPassword || !otp) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required.',
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format.',
            });
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password and confirm password do not match. Please try again.',
            });
        }

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User already registered.',
            });
        }

        // Fetch the most recent OTP for the email
        const recentOtp = await OTP.findOne({ email }).sort({ createdAt: -1 });
        if (!recentOtp) {
            return res.status(400).json({
                success: false,
                message: 'OTP not found. Please request a new OTP.',
            });
        }

        // Validate the provided OTP
        if (otp !== recentOtp.otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP. Please try again.',
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the user's profile
        const profileDetails = await Profile.create({
            gender: null,
            dateOfBirth: null,
            about: null,
            contactNumber: contactNumber || null,
        });

        // Create the new user
        const user = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            additionalDetails: profileDetails._id,
            image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`,
        });

        return res.status(201).json({
            success: true,
            message: 'User registered successfully.',
            user,
        });

    } catch (error) {
        console.error('Error during user registration:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error. Please check your input.',
            });
        } else if (error.name === 'MongoError' || error.code === 11000) {
            return res.status(500).json({
                success: false,
                message: 'Database error. Please try again later.',
            });
        }

        return res.status(500).json({
            success: false,
            message: 'User registration failed. Please try again later.',
        });
    }
};

//login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate request data
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required.",
            });
        }

        // Check if user is registered
        const user = await User.findOne({ email }).populate("additionalDetails");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User is not registered. Please sign up first.",
            });
        }

        // Compare the provided password with the stored hash
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: "Password is incorrect.",
            });
        }

        // Generate JWT token
        const payload = {
            email: user.email,
            id: user._id,
            account: user.accountType,
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "2D",
        });

        // Set token in the user object and exclude the password from the response
        user.token = token;
        user.password = undefined;

        // Set cookie options
        const options = {
            expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
            httpOnly: true,
        };

        return res.cookie("token", token, options).status(200).json({
            success: true,
            token,
            user,
            message: "Logged in successfully.",
        });

    } catch (error) {
        console.error("Login error:", error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: "Validation error. Please check your input.",
            });
        } else if (error.name === 'MongoError' || error.code === 11000) {
            return res.status(500).json({
                success: false,
                message: "Database error. Please try again later.",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Login failed. Please try again later.",
        });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const userDetails = await User.findById(req.user.id)

        const { oldPassword, newPassword } = req.body

        // Validate old password
        const isPasswordMatch = await bcrypt.compare(oldPassword, userDetails.password)
        if (!isPasswordMatch) {
            // If old password does not match, return a 401 (Unauthorized) error
            return res
                .status(401)
                .json({ success: false, message: "The password is incorrect" })
        }

        // Update password
        const encryptedPassword = await bcrypt.hash(newPassword, 10)
        const updatedUserDetails = await User.findByIdAndUpdate(
            req.user.id,
            { password: encryptedPassword },
            { new: true }
        )

        // Send notification email
        try {
            const emailResponse = await mailSender(
                updatedUserDetails.email,
                "Password for your account has been updated",
                passwordUpdated(
                    updatedUserDetails.email,
                    `Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
                )
            )
            console.log("Email sent successfully:", emailResponse.response)
        } catch (error) {
            console.error("Error occurred while sending email:", error)
            return res.status(500).json({
                success: false,
                message: "Error occurred while sending email",
                error: error.message,
            })
        }

        return res
            .status(200)
            .json({ success: true, message: "Password updated successfully" })
    } catch (error) {
        console.error("Error occurred while updating password:", error)
        return res.status(500).json({
            success: false,
            message: "Error occurred while updating password",
            error: error.message,
        })
    }
}