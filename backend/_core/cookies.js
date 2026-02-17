function isSecureRequest(req) {
    if (req.protocol === "https")
        return true;
    const forwardedProto = req.headers["x-forwarded-proto"];
    if (!forwardedProto)
        return false;
    const protoList = Array.isArray(forwardedProto)
        ? forwardedProto
        : forwardedProto.split(",");
    return protoList.some(proto => proto.trim().toLowerCase() === "https");
}
export function getSessionCookieOptions(req) {
    const secure = isSecureRequest(req);
    const sameSite = secure ? "none" : "lax";
    return {
        httpOnly: true,
        path: "/",
        sameSite,
        secure,
    };
}
  