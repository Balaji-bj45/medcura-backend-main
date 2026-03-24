const ServiceEnquiry = require("../models/ServiceEnquiry");

exports.createEnquiry = async (data) => {
  return await ServiceEnquiry.create(data);
};

exports.getAllEnquiries = async () => {
  return await ServiceEnquiry.find().sort({ createdAt: -1 });
};

exports.updateStatus = async (id, status) => {
  return await ServiceEnquiry.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );
};
