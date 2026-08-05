import { fetchKitCategories } from '@/lib/api'
import { KitBuilderClient } from '@/components/kit-builder/kit-builder-client'

export default async function KitBuilderPage() {
  // Fetched on the server so the first paint already has the steps, and so
  // the builder never renders against a bundled copy of the catalogue.
  const kitCategories = await fetchKitCategories()

  return <KitBuilderClient kitCategories={kitCategories} />
}
