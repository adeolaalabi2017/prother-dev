/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminCrud from "../adminCrud.js";
import type * as ads from "../ads.js";
import type * as analytics from "../analytics.js";
import type * as authStore from "../authStore.js";
import type * as categories from "../categories.js";
import type * as claims from "../claims.js";
import type * as comments from "../comments.js";
import type * as community from "../community.js";
import type * as compare from "../compare.js";
import type * as cronlib from "../cronlib.js";
import type * as crons from "../crons.js";
import type * as forum from "../forum.js";
import type * as health from "../health.js";
import type * as import_ from "../import.js";
import type * as media from "../media.js";
import type * as posts from "../posts.js";
import type * as search from "../search.js";
import type * as seo from "../seo.js";
import type * as shared from "../shared.js";
import type * as site from "../site.js";
import type * as submissions from "../submissions.js";
import type * as tools from "../tools.js";
import type * as trending from "../trending.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminCrud: typeof adminCrud;
  ads: typeof ads;
  analytics: typeof analytics;
  authStore: typeof authStore;
  categories: typeof categories;
  claims: typeof claims;
  comments: typeof comments;
  community: typeof community;
  compare: typeof compare;
  cronlib: typeof cronlib;
  crons: typeof crons;
  forum: typeof forum;
  health: typeof health;
  import: typeof import_;
  media: typeof media;
  posts: typeof posts;
  search: typeof search;
  seo: typeof seo;
  shared: typeof shared;
  site: typeof site;
  submissions: typeof submissions;
  tools: typeof tools;
  trending: typeof trending;
  users: typeof users;
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
