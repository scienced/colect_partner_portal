"use client"

import { useState, useCallback, useEffect } from "react"
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

  const handleInfoClick = useCallback((item: T) => {
    const asset = transformFn(item)
    setSelectedAsset(asset)
    setDrawerOpen(true)
    const url = new URL(window.location.href)
    url.searchParams.set("asset", item.id)
    router.replace(url.pathname + url.search, { scroll: false })
  }, [router, transformFn])

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false)
    setSelectedAsset(null)
    const url = new URL(window.location.href)
    url.searchParams.delete("asset")
    router.replace(url.pathname + url.search, { scroll: false })
  }, [router])

  // Handle deep linking via URL params
  useEffect(() => {
    const assetId = searchParams.get("asset")
    if (assetId && items.length > 0) {
      const found = items.find((item) => item.id === assetId)
      if (found) {
        handleInfoClick(found)
      }
    }
  }, [searchParams, items, handleInfoClick])

  return { selectedAsset, drawerOpen, handleInfoClick, handleDrawerClose }
}
