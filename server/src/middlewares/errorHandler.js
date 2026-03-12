function notFound(req, res, _next) {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(err, _req, res, _next) {
  // Keep details in server logs, return clean response to clients.
  // eslint-disable-next-line no-console
  console.error("Unhandled error:", err);

  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON body",
    });
  }

  const status = Number(err?.statusCode || err?.status || 500);
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  const message = safeStatus === 500 ? "Internal server error" : err.message || "Request failed";

  return res.status(safeStatus).json({
    success: false,
    message,
  });
}

module.exports = {
  notFound,
  errorHandler,
};
