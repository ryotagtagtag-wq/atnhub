import { onRequest as __api_schools__schoolId__chat_rooms__roomId__messages_ts_onRequest } from "/Users/ryotagtagtag/projects/atnhub/functions/api/schools/[schoolId]/chat/rooms/[roomId]/messages.ts"
import { onRequest as __api_schools__schoolId__chat_rooms_ts_onRequest } from "/Users/ryotagtagtag/projects/atnhub/functions/api/schools/[schoolId]/chat/rooms.ts"
import { onRequest as __api_schools__schoolId__attendance_ts_onRequest } from "/Users/ryotagtagtag/projects/atnhub/functions/api/schools/[schoolId]/attendance.ts"
import { onRequest as __api_schools__schoolId__users_ts_onRequest } from "/Users/ryotagtagtag/projects/atnhub/functions/api/schools/[schoolId]/users.ts"
import { onRequest as __api_admin_schools_ts_onRequest } from "/Users/ryotagtagtag/projects/atnhub/functions/api/admin/schools.ts"
import { onRequest as __api_auth_login_ts_onRequest } from "/Users/ryotagtagtag/projects/atnhub/functions/api/auth/login.ts"
import { onRequest as __api_health_ts_onRequest } from "/Users/ryotagtagtag/projects/atnhub/functions/api/health.ts"
import { onRequest as __hello_ts_onRequest } from "/Users/ryotagtagtag/projects/atnhub/functions/hello.ts"

export const routes = [
    {
      routePath: "/api/schools/:schoolId/chat/rooms/:roomId/messages",
      mountPath: "/api/schools/:schoolId/chat/rooms/:roomId",
      method: "",
      middlewares: [],
      modules: [__api_schools__schoolId__chat_rooms__roomId__messages_ts_onRequest],
    },
  {
      routePath: "/api/schools/:schoolId/chat/rooms",
      mountPath: "/api/schools/:schoolId/chat",
      method: "",
      middlewares: [],
      modules: [__api_schools__schoolId__chat_rooms_ts_onRequest],
    },
  {
      routePath: "/api/schools/:schoolId/attendance",
      mountPath: "/api/schools/:schoolId",
      method: "",
      middlewares: [],
      modules: [__api_schools__schoolId__attendance_ts_onRequest],
    },
  {
      routePath: "/api/schools/:schoolId/users",
      mountPath: "/api/schools/:schoolId",
      method: "",
      middlewares: [],
      modules: [__api_schools__schoolId__users_ts_onRequest],
    },
  {
      routePath: "/api/admin/schools",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_schools_ts_onRequest],
    },
  {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "",
      middlewares: [],
      modules: [__api_auth_login_ts_onRequest],
    },
  {
      routePath: "/api/health",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_health_ts_onRequest],
    },
  {
      routePath: "/hello",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__hello_ts_onRequest],
    },
  ]