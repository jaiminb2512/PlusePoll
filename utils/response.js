
const successResponse = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
    const response = {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
        ...(meta && { meta })
    };

    return res.status(statusCode).json(response);
};

const errorResponse = (res, message = 'Internal Server Error', statusCode = 500, error = null, code = null) => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
        ...(error && { error }),
        ...(code && { code })
    };

    return res.status(statusCode).json(response);
};

const validationErrorResponse = (res, errors, message = 'Validation Error') => {
    const response = {
        success: false,
        message,
        errors,
        timestamp: new Date().toISOString()
    };

    return res.status(400).json(response);
};

const notFoundResponse = (res, message = 'Resource not found', resource = null) => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
        ...(resource && { resource })
    };

    return res.status(404).json(response);
};

const unauthorizedResponse = (res, message = 'Unauthorized') => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString()
    };

    return res.status(401).json(response);
};

const forbiddenResponse = (res, message = 'Forbidden') => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString()
    };

    return res.status(403).json(response);
};

const healthResponse = (res, healthData, isHealthy = true) => {
    const response = {
        success: isHealthy,
        message: isHealthy ? 'Service is healthy' : 'Service is unhealthy',
        data: healthData,
        timestamp: new Date().toISOString()
    };

    return res.status(isHealthy ? 200 : 503).json(response);
};

module.exports = {
    successResponse,
    errorResponse,
    validationErrorResponse,
    notFoundResponse,
    unauthorizedResponse,
    forbiddenResponse,
    healthResponse
};
