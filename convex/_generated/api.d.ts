/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as sendInvite from "../sendInvite.js";
import type * as sprints from "../sprints.js";
import type * as taskHistory from "../taskHistory.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  http: typeof http;
  invites: typeof invites;
  sendInvite: typeof sendInvite;
  sprints: typeof sprints;
  taskHistory: typeof taskHistory;
  tasks: typeof tasks;
  users: typeof users;
  validators: typeof validators;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
