export interface LoginRequest {
  userId: string;
  password: string;
}
/* update the latest AUTHUSER 04-05-2026 */
// export interface AuthUser {
//   userId: string;
//   firstName: string;
//   lastName: string;
//   fullName: string;
//   designation?: string | null;
//   branch: string;
//   dept?: string | null;
//   userights?: string | null;
//   administrator: string;
//   stats?: string | null;
// }
/* END OF UPDATE */


/* UPDATED 04-05-2026 */
export interface AuthUser {
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  branch: string;
  designation: string;
  dept: string;
  userRights: string;
  userights?: string;
  administrator: string;
  stats: string;
  entity: string;
  permissions: UserPermission[];
}
/* end of update */

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: AuthUser | null;
}

/* UPDATED 04-05-2026 */
export interface UserPermission {
  permissionKey: string;
  moduleName: string;
  routePath?: string | null;
  parentPermissionKey?: string | null;
  canView: boolean;
  canOpen: boolean;
  sortOrder: number;
  isMenu: boolean;
}
/* end of update 04-05-2026 */
