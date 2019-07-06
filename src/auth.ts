import { Request, Response } from 'express';
import pg from './pg';

interface Permission {
  [key: string]: boolean;
}

export enum Action {
  create = 'create',
  read = 'read',
  update = 'update',
  delete = 'delete',
}

const createPermissionReducer = (accumulator: boolean, currentValue: Permission) =>
  accumulator || currentValue.can_create;

const readPermissionReducer = (accumulator: boolean, currentValue: Permission) =>
  accumulator || currentValue.can_read;

const updatePermissionReducer = (accumulator: boolean, currentValue: Permission) =>
  accumulator || currentValue.can_update;

const deletePermissionReducer = (accumulator: boolean, currentValue: Permission) =>
  accumulator || currentValue.can_delete;

const collapsePermissions = (action: Action, permissions: Permission[]) => {
  let permission: boolean;
  switch (action) {
    case Action.create:
      permission = permissions.reduce(createPermissionReducer, false);
      break;
    case Action.read:
      permission = permissions.reduce(readPermissionReducer, false);
      break;
    case Action.update:
      permission = permissions.reduce(updatePermissionReducer, false);
      break;
    case Action.delete:
      permission = permissions.reduce(deletePermissionReducer, false);
      break;
    default:
      permission = false;
  }
  return permission;
};

export const authenticate = (req: Request, res: Response, next: () => void) => {
  const user = req.headers.authorization; // TYPICALLY MORE COMPLICATED
  if (user === undefined) {
    res.status(401).send();
    return;
  }
  next();
};

export const authorize = (object: string, action: Action) => async (
  req: Request,
  res: Response,
  next: () => void
) => {
  const user = req.headers.authorization; // TYPICALLY TRANSFORMED BY AUTHENTICATE
  if (user === undefined) {
    res.status(401).send();
    return;
  }
  try {
    const profilePermissions = await pg
      .select<Permission[]>(`permissions_object.can_${action}`)
      .from('users')
      .innerJoin('profiles', 'users.profile_id', 'profiles.id')
      .innerJoin('profiles_permissions', 'profiles.id', 'profiles_permissions.profile_id')
      .innerJoin('permissions', 'profiles_permissions.permission_id', 'permissions.id')
      .innerJoin('permissions_object', 'permissions.id', 'permissions_object.permission_id')
      .where({
        'permissions_object.object': object,
        'users.name': user,
      });
    const profilePermission = collapsePermissions(action, profilePermissions);
    const permissionSetPermissions = await pg
      .select<Permission[]>(`permissions_object.can_${action}`)
      .from('users')
      .innerJoin('users_permission_sets', 'users.id', 'users_permission_sets.user_id')
      .innerJoin('permission_sets', 'users_permission_sets.permission_set_id', 'permission_sets.id')
      .innerJoin(
        'permission_sets_permissions',
        'permission_sets.id',
        'permission_sets_permissions.permission_set_id'
      )
      .innerJoin('permissions', 'permission_sets_permissions.permission_id', 'permissions.id')
      .innerJoin('permissions_object', 'permissions.id', 'permissions_object.permission_id')
      .where({
        'permissions_object.object': object,
        'users.name': user,
      });
    const permissionSetPermission = collapsePermissions(action, permissionSetPermissions);
    if (!profilePermission && !permissionSetPermission) {
      res.status(401).send();
      return;
    }
    next();
  } catch (err) {
    res.send(500).send();
    return;
  }
};
