import { InventoryScreen } from "@/components/inventory-screen"
import { BottomNav } from "@/components/bottom-nav"
console.log("Estamos en Page.tsx");

export default function Page() {
  return (
    <>
      <InventoryScreen />
      <BottomNav />
    </>
  )
}
