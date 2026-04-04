const customerService = require("../services/customerService");
const { successResponse } = require("../utils/apiResponse");
const {
  sendOtpSchema,
  verifyOtpSchema,
  googleAuthSchema,
  customerRegisterSchema,
  customerLoginSchema,
  customerForgotPasswordSchema,
  customerResetPasswordSchema,
  updateProfileSchema,
  addAddressSchema,
  updateAddressSchema,
} = require("../validations/customerValidation");

exports.sendOtp = async (req, res, next) => {
  try {
    const { error, value } = sendOtpSchema.validate(req.body);
    if (error) {
      throw { statusCode: 400, message: error.details[0].message };
    }

    const result = await customerService.sendOtp(value);

    return successResponse(res, 200, result, "OTP sent");
  } catch (err) {
    next(err);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { error, value } = verifyOtpSchema.validate(req.body);
    if (error) {
      throw { statusCode: 400, message: error.details[0].message };
    }

    const result = await customerService.verifyOtp({
      email: value.email,
      otpInput: value.otp,
      fullName: value.fullName,
      purpose: value.purpose,
    });

    return successResponse(res, 200, result, "Login successful");
  } catch (err) {
    next(err);
  }
};

exports.googleAuth = async (req, res, next) => {
  try {
    const { error, value } = googleAuthSchema.validate(req.body);
    if (error) {
      throw { statusCode: 400, message: error.details[0].message };
    }

    const result = await customerService.authenticateWithGoogle(value);

    return successResponse(res, 200, result, "Login successful");
  } catch (err) {
    next(err);
  }
};

exports.registerWithPassword = async (req, res, next) => {
  try {
    const { error, value } = customerRegisterSchema.validate(req.body);
    if (error) {
      throw { statusCode: 400, message: error.details[0].message };
    }

    const result = await customerService.registerWithPassword(value);
    return successResponse(res, 201, result, "Account created successfully");
  } catch (err) {
    next(err);
  }
};

exports.loginWithPassword = async (req, res, next) => {
  try {
    const { error, value } = customerLoginSchema.validate(req.body);
    if (error) {
      throw { statusCode: 400, message: error.details[0].message };
    }

    const result = await customerService.loginWithPassword(value);
    return successResponse(res, 200, result, "Login successful");
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { error, value } = customerForgotPasswordSchema.validate(req.body);
    if (error) {
      throw { statusCode: 400, message: error.details[0].message };
    }

    await customerService.forgotPassword(value.email);
    return successResponse(
      res,
      200,
      null,
      "If the account exists, a password reset email has been sent"
    );
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { error, value } = customerResetPasswordSchema.validate(req.body);
    if (error) {
      throw { statusCode: 400, message: error.details[0].message };
    }

    await customerService.resetPassword(value.token, value.password);
    return successResponse(res, 200, null, "Password reset successful");
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const profile = await customerService.getMyProfile(req.customer._id);
    return successResponse(res, 200, profile, "Profile fetched");
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      throw { statusCode: 400, message: error.details[0].message };
    }

    const profile = await customerService.updateMyProfile(req.customer._id, value);
    return successResponse(res, 200, profile, "Profile updated");
  } catch (err) {
    next(err);
  }
};

exports.addAddress = async (req, res, next) => {
  try {
    const { error, value } = addAddressSchema.validate(req.body);
    if (error) {
      throw { statusCode: 400, message: error.details[0].message };
    }

    const profile = await customerService.addAddress(req.customer._id, value);
    return successResponse(res, 200, profile, "Address added");
  } catch (err) {
    next(err);
  }
};

exports.updateAddress = async (req, res, next) => {
  try {
    const { error, value } = updateAddressSchema.validate(req.body);
    if (error) {
      throw { statusCode: 400, message: error.details[0].message };
    }

    const profile = await customerService.updateAddress(
      req.customer._id,
      req.params.addressId,
      value
    );
    return successResponse(res, 200, profile, "Address updated");
  } catch (err) {
    next(err);
  }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    const profile = await customerService.deleteAddress(
      req.customer._id,
      req.params.addressId
    );
    return successResponse(res, 200, profile, "Address deleted");
  } catch (err) {
    next(err);
  }
};
