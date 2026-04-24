class UploadSecurityError extends Error {
  constructor(message, statusCode = 400, code = 'UPLOAD_SECURITY_ERROR', metadata = null) {
    super(message);
    this.name = 'UploadSecurityError';
    this.statusCode = statusCode;
    this.code = code;
    this.metadata = metadata;
  }
}

module.exports = {
  UploadSecurityError
};
