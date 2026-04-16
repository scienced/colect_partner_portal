"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import type { AssetInfo } from "@/types"

/**
 * Shared hook for managing the asset info drawer with URL-based deep linking.
 *
 * @param items - The array of items (from SWR data)
 * @param transformFn - Function to transform a raw item into AssetInfo for the drawer
 */
export function useAssetDrawer<T extends { id: string }>(
  items: T[],
  transformFn: (item: T) => AssetInfo
) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [selectedAsset, setSelectedAsset] = useState<AssetInfo | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Track which asset id we've already opened from the URL param. This prevents
  // SWR revalidation (which produces a new `items` array reference) from
  // re-triggering handleInfoClick and re-mounting the drawer's effects.
  const processedAssetIdRef = useRef<string | null>(null)

  const handleInfoClick = useCallback((item: T) => {
    const asset = transformFn(item)
    setSelectedAsset(asset)
    setDrawerOpen(true)
    processedAssetIdRef.current = item.id
    const url = new URL(window.location.href)
    url.searchParams.set("asset", item.id)
    router.replace(url.pathname + url.search, { scroll: false })
  }, [router, transformFn])

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false)
    setSelectedAsset(null)
    processedAssetIdRef.current = null
    const url = new URL(window.location.href)
    url.searchParams.delete("asset")
    router.replace(url.pathname + url.search, { scroll: false })
  }, [router])

  // Handle deep linking via URL params. Fires at most once per asset id —
  // SWR revalidation changes `items` but the ref guard keeps the drawer stable.
  useEffect(() => {
    const assetId = searchParams.get("asset")

    // URL cleared → reset tracker so a new ?asset= can re-open
    if (!assetId) {
      processedAssetIdRef.current = null
      return
    }

    // Already opened this asset — don't re-trigger on items revalidation
    if (processedAssetIdRef.current === assetId) return

    // Items not loaded yet — wait for the next effect run
    if (items.length === 0) return

    const found = items.find((item) => item.id === assetId)
    if (found) {
      // Set the ref BEFORE invoking — guards against any code path where
      // handleInfoClick might defer or throw after state changes. Single
      // source of truth: this effect owns "what's processed".
      processedAssetIdRef.current = assetId
      handleInfoClick(found)
    }
  }, [searchParams, items, handleInfoClick])

  return { selectedAsset, drawerOpen, handleInfoClick, handleDrawerClose }
}
