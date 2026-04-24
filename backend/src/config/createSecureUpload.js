const { createUploadFileSecurity } = require('../middlewares/uploadFileSecurity');

function wrapUploadMiddleware(uploadMiddleware, securityMiddleware) {
  return (req, res, next) => {
    uploadMiddleware(req, res, (error) => {
      if (error) {
        return next(error);
      }

      return securityMiddleware(req, res, next);
    });
  };
}

function createSecureUpload(multerInstance, profile = 'documents') {
  const securityMiddleware = createUploadFileSecurity(profile);

  return {
    single(fieldName) {
      return wrapUploadMiddleware(multerInstance.single(fieldName), securityMiddleware);
    },
    array(fieldName, maxCount) {
      return wrapUploadMiddleware(multerInstance.array(fieldName, maxCount), securityMiddleware);
    },
    fields(fields) {
      return wrapUploadMiddleware(multerInstance.fields(fields), securityMiddleware);
    },
    any() {
      return wrapUploadMiddleware(multerInstance.any(), securityMiddleware);
    },
    none() {
      return multerInstance.none();
    }
  };
}

module.exports = createSecureUpload;
