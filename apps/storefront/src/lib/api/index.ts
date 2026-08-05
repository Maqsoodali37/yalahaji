// Public surface of the API layer.
//
// Components import from '@/lib/api' and never from './wire' — the Wire*
// types are the API's shape, not the storefront's, and letting them escape
// this directory is what would reintroduce the paisas/rupees and
// flat/nested mismatches the adapters exist to absorb.

export { ApiError, API_URL, buildQuery } from './client'
export type { RequestOptions } from './client'

export {
  paisasToRupees,
  rupeesToPaisas,
  toBlogCategory,
  fromBlogCategory,
} from './adapters'
export type { StoreSettings } from './adapters'

export {
  fetchProducts,
  fetchProductBySlug,
  fetchRelatedProducts,
  fetchFeaturedProducts,
  fetchNewArrivals,
  searchProducts,
  notifyWhenInStock,
} from './products'
export type { ProductFilters, ProductPage } from './products'

export {
  fetchCategories,
  fetchCategoryBySlug,
  fetchFeaturedCategories,
  fetchProductReviews,
  fetchBlogPosts,
  fetchBlogPostBySlug,
  fetchFeaturedBlogPosts,
  fetchBlogPostsByCategory,
  fetchSettings,
  SETTINGS_FALLBACK,
} from './catalog'
export type { ReviewPage, BlogPage } from './catalog'

export {
  login,
  register,
  fetchMe,
  logout,
  isAuthenticated,
  normalisePhone,
  isValidPakistaniPhone,
  fetchAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  updateProfile,
  fetchWishlistIds,
  addToWishlist,
  removeFromWishlist,
} from './auth'
export type { AddressInput } from './auth'

export {
  fetchCart,
  upsertCartItem,
  removeCartItem,
  clearCart,
  mergeGuestCart,
  validateCoupon,
} from './cart'
export type { CouponResult } from './cart'

export {
  placeOrder,
  fetchMyOrders,
  fetchMyOrder,
  cancelOrder,
  trackOrder,
} from './orders'
export type { PlaceOrderInput, OrderAddressInput, OrderPage, TrackedOrder } from './orders'

export { ensureSessionId, clearSessionId } from './session'
export { getToken, setToken, clearToken } from './token'
