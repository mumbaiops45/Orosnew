import api from "@/lib/axios";

/** GET /notifications -> the signed-in user's notifications, newest first.
 *  Admins are the recipients of the admin-side events, so an admin token
 *  gets the admin feed and a customer token gets their own. */
export const listNotifications = () => api.get("/notifications");
