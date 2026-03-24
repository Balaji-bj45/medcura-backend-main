const {
  loginAdmin,
  forgotPassword: forgotPasswordService,
  resetPassword: resetPasswordService,
} = require("../services/authService");
const {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validations/authValidation");
const { successResponse } = require("../utils/apiResponse");

exports.login = async (req, res, next) => {
  try {
    const { error } = loginSchema.validate(req.body);

    if (error) {
      throw { statusCode: 400, message: error.details[0].message };
    }

    const { email, password } = req.body;

    const result = await loginAdmin(email, password);

    return successResponse(res, 200, result, "Login successful");
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { error } = forgotPasswordSchema.validate(req.body);

    if (error) {
      throw { statusCode: 400, message: error.details[0].message };
    }

    await forgotPasswordService(req.body.email);

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
    const { error } = resetPasswordSchema.validate(req.body);

    if (error) {
      throw { statusCode: 400, message: error.details[0].message };
    }

    const { token, password } = req.body;
    await resetPasswordService(token, password);

    return successResponse(res, 200, null, "Password reset successful");
  } catch (err) {
    next(err);
  }
};
